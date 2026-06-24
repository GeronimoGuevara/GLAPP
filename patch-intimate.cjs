const fs = require('fs');

// Patch EncryptedImage.jsx
let encCode = fs.readFileSync('src/components/EncryptedImage.jsx', 'utf8');
encCode = encCode.replace(/pin, /g, 'encryptionKey, ');
encCode = encCode.replace(/pin\)/g, 'encryptionKey)');
encCode = encCode.replace(/pin\]/g, 'encryptionKey]');
fs.writeFileSync('src/components/EncryptedImage.jsx', encCode);

// Patch IntimateTracker.jsx
let intCode = fs.readFileSync('src/components/IntimateTracker.jsx', 'utf8');
intCode = intCode.replace(/getPartnerPin/g, 'getEncryptionKey');
intCode = intCode.replace(/const partnerPin = await getEncryptionKey\(user.couple_id, user.id\);/g, 'const encryptionKey = await getEncryptionKey(user.couple_id);');
intCode = intCode.replace(/user\.pin, partnerPin/g, 'encryptionKey');

// We need to fetch encryptionKey on mount so the images can render
intCode = intCode.replace(/const \[moments, setMoments\] = useState\(\[\]\);/, "const [moments, setMoments] = useState([]);\n  const [encryptionKey, setEncryptionKey] = useState(null);");
intCode = intCode.replace(/loadMoments\(\);\n  }, \[\]\);/, "loadMoments();\n    getEncryptionKey(user.couple_id).then(key => setEncryptionKey(key));\n  }, [user.couple_id]);");

// Pass encryptionKey to EncryptedImage
intCode = intCode.replace(/pin={user\.pin}/g, 'encryptionKey={encryptionKey}');

fs.writeFileSync('src/components/IntimateTracker.jsx', intCode);
console.log('Patched');
