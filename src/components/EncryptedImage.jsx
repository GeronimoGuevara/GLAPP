import { useState, useEffect } from 'react';
import { decryptImage } from '../lib/cloudinary';
import { Lock } from 'lucide-react';

export default function EncryptedImage({ url, pin, alt = 'Imagen íntima', className = '' }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    
    async function load() {
      try {
        setLoading(true);
        const decryptedUrl = await decryptImage(url, pin);
        if (isMounted) {
          setSrc(decryptedUrl);
          setLoading(false);
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
      // Idealmente podríamos liberar el object URL: URL.revokeObjectURL(src)
      // Pero si la imagen sigue en pantalla es mejor dejarlo.
    };
  }, [url, pin]);

  if (!url) return null;

  if (loading) {
    return (
      <div className={`encrypted-img-placeholder ${className}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--text-light)', aspectRatio: '1/1', borderRadius: '8px' }}>
        <Lock size={20} className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`encrypted-img-error ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--error)', aspectRatio: '1/1', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
        <Lock size={20} style={{ marginBottom: '0.5rem' }} />
        <span style={{ fontSize: '0.75rem' }}>Error de PIN</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }} />;
}
