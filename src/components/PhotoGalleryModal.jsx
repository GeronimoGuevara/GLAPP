import { useEffect, useState } from 'react';
import { X, Image as ImageIcon, Lock, Trash2, Camera, Plus } from 'lucide-react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { getCouplePhotos, addCouplePhoto, deleteCouplePhoto, getEncryptionKey } from '../lib/database';
import { uploadImageToCloudinary, uploadEncryptedImage } from '../lib/cloudinary';
import EncryptedImage from './EncryptedImage';

const PAGE_SIZE = 24;

export default function PhotoGalleryModal({ user, onClose }) {
  const [activeTab, setActiveTab] = useState('unencrypted'); // 'unencrypted' or 'encrypted'
  const [isUploading, setIsUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [photoLimit, setPhotoLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setPhotoLimit(PAGE_SIZE);
  }, [activeTab]);

  // SWR Fetching
  const { data: photosResult, mutate: loadPhotos } = useSWR(
    user?.couple_id ? ['getCouplePhotos', user.couple_id, activeTab, photoLimit] : null,
    ([_, id, cat, limit]) => getCouplePhotos(id, cat, limit + 1),
    { revalidateOnFocus: false }
  );

  const rawPhotos = photosResult?.data || [];
  const hasMorePhotos = rawPhotos.length > photoLimit;
  const photos = hasMorePhotos ? rawPhotos.slice(0, photoLimit) : rawPhotos;

  // Get encryption key using SWR (cached)
  const { data: encryptionKey } = useSWR(
    user?.couple_id ? ['getEncryptionKey', user.couple_id] : null,
    ([_, id]) => getEncryptionKey(id),
    { revalidateOnFocus: false }
  );

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (activeTab === 'encrypted' && !encryptionKey) {
      toast.error('No se pudo obtener la llave de encriptación.');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('Subiendo foto...');
    try {
      let secureUrl;
      if (activeTab === 'encrypted') {
        secureUrl = await uploadEncryptedImage(file, encryptionKey);
      } else {
        // Upload normally to Cloudinary
        secureUrl = await uploadImageToCloudinary(file);
      }

      const res = await addCouplePhoto(user.couple_id, user.id, secureUrl, activeTab);
      if (res.success) {
        toast.success('Foto añadida a la galería', { id: loadingToast });
        loadPhotos();
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      toast.error('Error al subir: ' + error.message, { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta foto?')) return;
    
    const loadingToast = toast.loading('Eliminando...');
    const res = await deleteCouplePhoto(photoId);
    if (res.success) {
      toast.success('Foto eliminada', { id: loadingToast });
      loadPhotos();
    } else {
      toast.error('Error al eliminar', { id: loadingToast });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
      <div className="modal-content gallery-modal" onClick={e => e.stopPropagation()} style={{ width: '100%', height: '100%', maxWidth: '600px', borderRadius: '0', display: 'flex', flexDirection: 'column', padding: '0' }}>
        
        {/* Header */}
        <div style={{ padding: '1rem', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ImageIcon size={20} />
            Galería de Pareja
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <button 
            onClick={() => setActiveTab('unencrypted')}
            style={{ 
              flex: 1, padding: '1rem', background: 'none', border: 'none', 
              borderBottom: activeTab === 'unencrypted' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'unencrypted' ? 'var(--primary)' : 'var(--text-light)',
              fontWeight: activeTab === 'unencrypted' ? 'bold' : 'normal',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <ImageIcon size={16} />
            Públicas (Memoria)
          </button>
          <button 
            onClick={() => setActiveTab('encrypted')}
            style={{ 
              flex: 1, padding: '1rem', background: 'none', border: 'none', 
              borderBottom: activeTab === 'encrypted' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'encrypted' ? 'var(--primary)' : 'var(--text-light)',
              fontWeight: activeTab === 'encrypted' ? 'bold' : 'normal',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <Lock size={16} />
            Privadas (E2EE)
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--background)' }}>
          {activeTab === 'unencrypted' && (
            <div style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(255,107,157,0.1)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--primary)', textAlign: 'center' }}>
              Las fotos de esta pestaña se utilizarán automáticamente en el juego de Memoria.
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            
            {/* Upload Button */}
            <label style={{ 
              aspectRatio: '1/1', border: '2px dashed var(--border)', borderRadius: '8px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', color: 'var(--text-light)', background: 'var(--surface)'
            }}>
              {isUploading ? <span className="spinner" style={{ width: '24px', height: '24px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Plus size={32} />}
              <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Añadir</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
            </label>

            {/* Photos */}
            {photos.map(photo => (
              <div key={photo.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', background: '#eee' }}>
                {activeTab === 'encrypted' ? (
                  <EncryptedImage 
                    url={photo.url} 
                    encryptionKey={encryptionKey} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onClick={() => setFullscreenImage({ url: photo.url, encrypted: true })}
                  />
                ) : (
                  <img 
                    src={photo.url} 
                    alt="Couple" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                    onClick={() => setFullscreenImage({ url: photo.url, encrypted: false })}
                  />
                )}
                
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {hasMorePhotos && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPhotoLimit(limit => limit + PAGE_SIZE)}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Cargar mas fotos
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div className="fullscreen-overlay" onClick={() => setFullscreenImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button className="modal-close" onClick={() => setFullscreenImage(null)} style={{ color: 'white', background: 'rgba(0,0,0,0.5)' }}>
            <X size={24} />
          </button>
          {fullscreenImage.encrypted ? (
            <EncryptedImage 
              url={fullscreenImage.url} 
              encryptionKey={encryptionKey} 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
            />
          ) : (
            <img src={fullscreenImage.url} alt="Fullscreen" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </div>
      )}
    </div>
  );
}

