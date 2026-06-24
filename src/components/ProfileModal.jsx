import { useState, useEffect } from 'react';
import { User, X, Camera, Lock, LogOut, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPartner, updateUserPassword, updateUserAvatar } from '../lib/database';
import { uploadImageToCloudinary } from '../lib/cloudinary';

export default function ProfileModal({ user, onClose, onLogout, onUserUpdate, onShowSummary }) {
  const [partner, setPartner] = useState(null);
  const [isLoadingPartner, setIsLoadingPartner] = useState(true);
  
  // States for PIN change
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    async function fetchPartner() {
      if (user.couple_id) {
        const res = await getPartner(user.couple_id, user.id);
        if (res.success) {
          setPartner(res.data);
        }
      }
      setIsLoadingPartner(false);
    }
    fetchPartner();
  }, [user]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Compress/resize image using Canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        const loadingToast = toast.loading('Subiendo foto...');
        try {
          // Subir a Cloudinary (dataUrl funciona perfectamente con auto/upload)
          const secureUrl = await uploadImageToCloudinary(dataUrl);
          
          const res = await updateUserAvatar(user.id, secureUrl);
          if (res.success) {
            toast.success('Foto actualizada', { id: loadingToast });
            onUserUpdate(res.data);
          } else {
            throw new Error(res.error || 'Error al guardar');
          }
        } catch (error) {
          toast.error('Error al subir: ' + error.message, { id: loadingToast });
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setIsSavingPassword(true);
    const res = await updateUserPassword(user.id, currentPassword, newPassword);
    setIsSavingPassword(false);
    
    if (res.success) {
      setPasswordSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess('');
      }, 2000);
      onUserUpdate(res.data);
    } else {
      setPasswordError(res.error || 'Error al cambiar contraseña');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '0', overflow: 'hidden' }}>
        <button className="modal-close" onClick={onClose} style={{ zIndex: 10 }}>
          <X size={24} />
        </button>
        
        <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', padding: '3rem 2rem 2rem', textAlign: 'center', color: 'white' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', backgroundColor: 'var(--surface)' }} />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '3rem', border: '4px solid white' }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            <label style={{ position: 'absolute', bottom: '0', right: '0', background: 'white', color: 'var(--primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <Camera size={16} />
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{display: 'none'}} />
            </label>
          </div>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0' }}>{user.name}</h2>
          <p style={{ opacity: '0.8', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>{user.email || 'Sin correo asociado'}</p>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Resultados del Mes Anterior */}
          <button 
            onClick={onShowSummary}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '16px', border: '1px dashed var(--primary)', background: 'rgba(255,107,157,0.05)', cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '1.5rem', transition: 'all 0.2s' }}
          >
            <Calendar size={18} />
            Ver Resultados del Mes Anterior
          </button>

          {/* Partner Section */}
          <div style={{ background: 'var(--background)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isLoadingPartner ? (
              <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem' }}>Cargando pareja...</div>
            ) : partner ? (
              <>
                {partner.avatar ? (
                  <img src={partner.avatar} alt="Partner" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {partner.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0', fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Tu Pareja</p>
                  <p style={{ margin: '0', fontWeight: '600', color: 'var(--text)' }}>{partner.name}</p>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                Esperando a que tu pareja se una...
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isChangingPassword ? (
              <div style={{ background: 'var(--background)', borderRadius: '16px', padding: '1rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text)' }}>Cambiar Contraseña</h3>
                <form onSubmit={handlePasswordChangeSubmit}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Contraseña Actual</label>
                    <input 
                      type="password" 
                      minLength="6"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value.replace(/\D/g, ''))}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.5rem' }}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Nuevo PIN</label>
                    <input 
                      type="password" 
                      minLength="6"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.5rem' }}
                      required
                    />
                  </div>
                  
                  {passwordError && <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={14}/> {passwordError}</p>}
                  {passwordSuccess && <p style={{ color: 'var(--success)', fontSize: '0.85rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14}/> {passwordSuccess}</p>}
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => { setIsChangingPassword(false); setPasswordError(''); setCurrentPassword(''); setNewPassword(''); }} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
                    <button type="submit" disabled={isSavingPassword} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>{isSavingPassword ? 'Guardando...' : 'Guardar'}</button>
                  </div>
                </form>
              </div>
            ) : (
              <button 
                onClick={() => setIsChangingPassword(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', border: '2px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)', fontWeight: '500', transition: 'all 0.2s' }}
              >
                <div style={{ background: 'var(--background)', padding: '0.5rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <Lock size={20} />
                </div>
                Cambiar Contraseña de seguridad
              </button>
            )}

            <button 
              onClick={onLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', border: 'none', background: 'var(--background)', cursor: 'pointer', color: 'var(--error)', fontWeight: 'bold', marginTop: '1rem' }}
            >
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '50%', color: 'var(--error)' }}>
                <LogOut size={20} />
              </div>
              Cerrar sesión en dispositivo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
