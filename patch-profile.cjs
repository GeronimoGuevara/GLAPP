const fs = require('fs');

let code = fs.readFileSync('src/components/ProfileModal.jsx', 'utf8');

// Update imports
code = code.replace(/updateUserPin/g, 'updateUserPassword');

// Update state names
code = code.replace(/isChangingPin/g, 'isChangingPassword');
code = code.replace(/setIsChangingPin/g, 'setIsChangingPassword');
code = code.replace(/currentPin/g, 'currentPassword');
code = code.replace(/setCurrentPin/g, 'setCurrentPassword');
code = code.replace(/newPin/g, 'newPassword');
code = code.replace(/setNewPin/g, 'setNewPassword');
code = code.replace(/pinError/g, 'passwordError');
code = code.replace(/setPinError/g, 'setPasswordError');
code = code.replace(/pinSuccess/g, 'passwordSuccess');
code = code.replace(/setPinSuccess/g, 'setPasswordSuccess');
code = code.replace(/isSavingPin/g, 'isSavingPassword');
code = code.replace(/setIsSavingPin/g, 'setIsSavingPassword');
code = code.replace(/handlePinChangeSubmit/g, 'handlePasswordChangeSubmit');

// Update validation logic
code = code.replace(/if \(currentPassword\.length !== 4 \|\| newPassword\.length !== 4\)/g, 'if (newPassword.length < 6)');
code = code.replace(/setPasswordError\('Ambos PINs deben tener 4 dígitos'\);/g, "setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');");

// Update success message
code = code.replace(/setPasswordSuccess\('PIN actualizado correctamente'\);/g, "setPasswordSuccess('Contraseña actualizada correctamente');");
code = code.replace(/setPasswordError\(res\.error \|\| 'Error al cambiar PIN'\);/g, "setPasswordError(res.error || 'Error al cambiar contraseña');");

// Update UI texts
code = code.replace(/Cambiar PIN/g, 'Cambiar Contraseña');
code = code.replace(/PIN Actual/g, 'Contraseña Actual');
code = code.replace(/Nuevo PIN de 4 dígitos/g, 'Nueva Contraseña');
code = code.replace(/placeholder="1234"/g, 'placeholder="Contraseña actual" type="password"');
code = code.replace(/placeholder="Nuevo PIN"/g, 'placeholder="Nueva contraseña" type="password"');
code = code.replace(/maxLength="4"/g, 'minLength="6"');
code = code.replace(/pattern="\\d{4}"/g, ''); // Remove pattern

fs.writeFileSync('src/components/ProfileModal.jsx', code);
console.log('ProfileModal patched');
