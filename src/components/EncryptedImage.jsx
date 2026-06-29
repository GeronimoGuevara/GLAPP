import { useState, useEffect } from 'react';
import { decryptImage } from '../lib/cloudinary';
import { Lock } from 'lucide-react';

export default function EncryptedImage({ url, encryptionKey, alt = 'Imagen privada', className = '', style = {}, onClick }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      setError(false);
      setLoading(false);
      return undefined;
    }
    
    let isMounted = true;
    let objectUrl = null;
    
    async function load() {
      try {
        setLoading(true);
        setError(false);
        setSrc(null);

        const decryptedUrl = await decryptImage(url, encryptionKey);
        if (!decryptedUrl) {
          throw new Error('No se pudo desencriptar la imagen');
        }

        objectUrl = decryptedUrl;
        if (isMounted) {
          setSrc(decryptedUrl);
          setLoading(false);
        } else {
          URL.revokeObjectURL(decryptedUrl);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError(true);
          setLoading(false);
        }
      }
    }
    
    load();
    
    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url, encryptionKey]);

  if (!url) return null;

  if (loading) {
    return (
      <div className={`encrypted-img-placeholder ${className}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--text-light)', aspectRatio: '1/1', borderRadius: '8px', ...style }} onClick={onClick}>
        <Lock size={20} className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`encrypted-img-error ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--error)', aspectRatio: '1/1', borderRadius: '8px', padding: '1rem', textAlign: 'center', ...style }} onClick={onClick}>
        <Lock size={20} style={{ marginBottom: '0.5rem' }} />
        <span style={{ fontSize: '0.75rem' }}>No se pudo abrir</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} style={{ width: '100%', borderRadius: '8px', objectFit: 'cover', ...style }} onClick={onClick} />;
}
