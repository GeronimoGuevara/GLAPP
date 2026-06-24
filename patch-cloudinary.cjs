const fs = require('fs');

const content = `// Utilidades para Cloudinary y Encriptación (E2EE)

export async function uploadImageToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Variables de entorno de Cloudinary no configuradas.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(\`https://api.cloudinary.com/v1_1/\${cloudName}/auto/upload\`, {
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

async function deriveKey(masterKeyStr) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterKeyStr),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

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

export async function encryptFile(file, encryptionKey) {
  const kek = await deriveKey(encryptionKey);
  const fileBuffer = await file.arrayBuffer();
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    kek,
    fileBuffer
  );

  const magic = new TextEncoder().encode('E2E3');
  const payload = new Uint8Array(4 + 12 + ciphertext.byteLength);
  
  payload.set(magic, 0);
  payload.set(iv, 4);
  payload.set(new Uint8Array(ciphertext), 16);

  return new Blob([payload], { type: 'application/octet-stream' });
}

export async function decryptImage(url, encryptionKey) {
  try {
    if (!encryptionKey) throw new Error('Llave de encriptación no proporcionada');
    
    const key = await deriveKey(encryptionKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo descargar la imagen');
    
    const encryptedArray = new Uint8Array(await response.arrayBuffer());
    const magicStr = new TextDecoder().decode(encryptedArray.slice(0, 4));

    let fileBuffer;

    if (magicStr === 'E2E3') {
      const iv = encryptedArray.slice(4, 16);
      const ciphertext = encryptedArray.slice(16);
      fileBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
    } else {
      console.warn("Formato antiguo detectado. No se puede desencriptar con la nueva Master Key.");
      return null;
    }

    const blob = new Blob([fileBuffer]);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error desencriptando:', error);
    return null;
  }
}

export async function uploadEncryptedImage(file, encryptionKey) {
  try {
    if (!encryptionKey) throw new Error('Llave de encriptación requerida');
    
    const encryptedBlob = await encryptFile(file, encryptionKey);
    const encryptedFile = new File([encryptedBlob], file.name + '.enc', { type: 'application/octet-stream' });
    const url = await uploadImageToCloudinary(encryptedFile);
    return url;
  } catch (error) {
    console.error('Error en uploadEncryptedImage:', error);
    throw error;
  }
}
`;

fs.writeFileSync('src/lib/cloudinary.js', content);
