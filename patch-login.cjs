const fs = require('fs');
let code = fs.readFileSync('src/components/Login.jsx', 'utf8');

// Rename pin state to password
code = code.replace(/const \[pin, setPin\] = useState\(''\);/, "const [password, setPassword] = useState('');");

// Replace handlePinInput and handleClear with empty string (we don't need them)
code = code.replace(/const handlePinInput = [\s\S]*?};/, '');
code = code.replace(/const handleClear = [\s\S]*?};/, '');
code = code.replace(/const renderPinPad = \(\) => \([\s\S]*?\);\n/, '');
code = code.replace(/const renderPinDots = \(\) => \([\s\S]*?\);\n/, '');

// Fix handleUnlock
code = code.replace(/const handleUnlock = async \(e\) => {[\s\S]*?if \(pin.length !== 4\) return;/, 'const handleUnlock = async (e) => {\n    e.preventDefault();\n    if (!password) return;');
code = code.replace(/loginUser\(unlockUser\.email, pin\)/g, 'loginUser(unlockUser.email, password)');
code = code.replace(/setPin\(''\)/g, "setPassword('')");
code = code.replace(/pin, /g, 'password, ');
code = code.replace(/pin:/g, 'password:');

// Update handleRegisterUser
code = code.replace(/registerUser\(name, userEmail, pin, gender\)/, 'registerUser(name, userEmail, password, gender)');
code = code.replace(/if \(pin\.length !== 4\) {\s*setError\('El PIN debe tener 4 dígitos'\);\s*return;\s*}/, "if (password.length < 6) {\n      setError('La contraseña debe tener al menos 6 caracteres');\n      return;\n    }");
code = code.replace(/if \(pin\.length !== 4\) return;/, 'if (!password) return;');

// Update handleLoginExisting
code = code.replace(/loginUser\(userEmail, pin\)/, 'loginUser(userEmail, password)');

// Fix UI in unlock mode
code = code.replace(/<p>Ingresa tu PIN para entrar<\/p>/, '<p>Ingresa tu contraseña para entrar</p>');
code = code.replace(/{renderPinDots\(\)}/, '<div className="form-group" style={{ marginBottom: \'1rem\' }}><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu Contraseña" required style={{ width: \'100%\', padding: \'0.8rem\', borderRadius: \'8px\', border: \'2px solid var(--border)\', background: \'var(--background)\', color: \'var(--text)\', fontSize: \'1rem\' }} /></div>');
code = code.replace(/{renderPinPad\(\)}/, '<button type="submit" className="pin-btn enter" disabled={isLoading} style={{ width: \'100%\', marginTop: \'1rem\' }}>Entrar</button>');

// Fix UI in register mode
code = code.replace(/<label[^>]*>Crea un PIN de 4 dígitos<\/label>\s*{renderPinDots\(\)}/m, '<label style={{ display: \'block\', textAlign: \'left\', marginBottom: \'0.5rem\', color: \'var(--text)\', fontWeight: \'500\' }}>Crea una Contraseña (mín. 6 caracteres)</label>\n                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" required style={{ width: \'100%\', padding: \'0.8rem\', borderRadius: \'8px\', border: \'2px solid var(--border)\', background: \'var(--background)\', color: \'var(--text)\', fontSize: \'1rem\' }} />');
code = code.replace(/{renderPinPad\(\)}/m, '<button type="submit" className="pin-btn enter" disabled={isLoading} style={{ width: \'100%\', marginTop: \'1rem\' }}>Registrarme</button>');

// Fix UI in login_existing mode
code = code.replace(/<label[^>]*>Tu PIN de 4 dígitos<\/label>\s*{renderPinDots\(\)}/m, '<label style={{ display: \'block\', textAlign: \'left\', marginBottom: \'0.5rem\', color: \'var(--text)\', fontWeight: \'500\' }}>Tu Contraseña</label>\n                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" required style={{ width: \'100%\', padding: \'0.8rem\', borderRadius: \'8px\', border: \'2px solid var(--border)\', background: \'var(--background)\', color: \'var(--text)\', fontSize: \'1rem\' }} />');
code = code.replace(/{renderPinPad\(\)}/m, '<button type="submit" className="pin-btn enter" disabled={isLoading} style={{ width: \'100%\', marginTop: \'1rem\' }}>Entrar</button>');

fs.writeFileSync('src/components/Login.jsx', code);
console.log('Login.jsx updated');
