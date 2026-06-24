// Utilidades para Cloudinary y Encriptación (E2EE)

/**
 * Sube una imagen (o Blob) a Cloudinary de forma directa (Unsigned).
 * @param {File|Blob} file Archivo a subir
 * @returns {Promise<string>} URL segura de la imagen subida
 */
export async function uploadImageToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Variables de entorno de Cloudinary no configuradas.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Error al subir la imagen a Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}

// ==========================================
// END-TO-END ENCRYPTION PARA FOTOS ÍNTIMAS
// ==========================================

// Deriva una llave AES-GCM de 256 bits a partir del PIN de 4 dígitos usando PBKDF2
async function deriveKey(pin) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Usamos una "sal" estática (para que el mismo PIN siempre genere la misma llave para esta app)
  // Nota: En sistemas más complejos la sal se guarda con cada archivo, pero aquí una estática funciona para PWA.
  const salt = enc.encode('glapp-intimate-salt-2026');

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encripta un archivo (imagen) usando el PIN.
 * @param {File} file Archivo a encriptar
 * @param {string} pin PIN del usuario (4 dígitos)
 * @returns {Promise<Blob>} Blob con [IV (12 bytes) + Ciphertext]
 */
export async function encryptFile(file, myPin, partnerPin) {
  const enc = new TextEncoder();
  const dek = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const dekBytes = await window.crypto.subtle.exportKey('raw', dek);

  const kek1 = await deriveKey(myPin);
  let kek2 = kek1;
  if (partnerPin && partnerPin !== myPin) {
    kek2 = await deriveKey(partnerPin);
  }

  const ivDek1 = window.crypto.getRandomValues(new Uint8Array(12));
  const encDek1 = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivDek1 },
    kek1,
    dekBytes
  );

  const ivDek2 = window.crypto.getRandomValues(new Uint8Array(12));
  const encDek2 = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivDek2 },
    kek2,
    dekBytes
  );

  const fileBuffer = await file.arrayBuffer();
  const ivFile = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivFile },
    dek,
    fileBuffer
  );

  const magic = enc.encode('E2E2');
  const payload = new Uint8Array(magic.length + 12 + 48 + 12 + 48 + 12 + ciphertext.byteLength);
  let offset = 0;
  
  payload.set(magic, offset); offset += 4;
  payload.set(ivDek1, offset); offset += 12;
  payload.set(new Uint8Array(encDek1), offset); offset += 48;
  payload.set(ivDek2, offset); offset += 12;
  payload.set(new Uint8Array(encDek2), offset); offset += 48;
  payload.set(ivFile, offset); offset += 12;
  payload.set(new Uint8Array(ciphertext), offset);

  return new Blob([payload], { type: 'application/octet-stream' });
}

/**
 * Descarga una imagen encriptada desde una URL y la desencripta usando el PIN.
 * @param {string} url URL de Cloudinary
 * @param {string} pin PIN del usuario
 * @returns {Promise<string>} Blob URL (Object URL) de la imagen desencriptada lista para usar en <img src="...">
 */
export async function decryptImage(url, pin) {
  try {
    const key = await deriveKey(pin);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo descargar la imagen');
    
    const encryptedBuffer = await response.arrayBuffer();
    const encryptedArray = new Uint8Array(encryptedBuffer);
    
    const dec = new TextDecoder();
    const magicStr = dec.decode(encryptedArray.slice(0, 4));

    if (magicStr === 'E2E2') {
      // Formato Dual PIN
      const ivDek1 = encryptedArray.slice(4, 16);
      const encDek1 = encryptedArray.slice(16, 64);
      const ivDek2 = encryptedArray.slice(64, 76);
      const encDek2 = encryptedArray.slice(76, 124);
      const ivFile = encryptedArray.slice(124, 136);
      const ciphertext = encryptedArray.slice(136);

      let dekBytes;
      try {
        dekBytes = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivDek1 }, key, encDek1);
      } catch (e1) {
        try {
          dekBytes = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivDek2 }, key, encDek2);
        } catch (e2) {
          throw new Error('PIN incorrecto para desencriptar la foto');
        }
      }

      const dek = await window.crypto.subtle.importKey('raw', dekBytes, { name: 'AES-GCM' }, false, ['decrypt']);
      const decryptedBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivFile }, dek, ciphertext);
      
      const blob = new Blob([decryptedBuffer], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
      
    } else {
      // Formato Single PIN Antiguo
      const iv = encryptedArray.slice(0, 12);
      const ciphertext = encryptedArray.slice(12);
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );
      
      const blob = new Blob([decryptedBuffer], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.error('Error desencriptando imagen (¿PIN incorrecto?):', error);
    throw new Error('PIN incorrecto o archivo dañado');
  }
}

/**
 * Encripta y luego sube la imagen a Cloudinary.
 */
export async function uploadEncryptedImage(file, myPin, partnerPin) {
  const encryptedBlob = await encryptFile(file, myPin, partnerPin);
  return uploadImageToCloudinary(encryptedBlob);
}
