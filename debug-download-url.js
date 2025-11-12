// Debug script to check download URL format
const shareId = '4fe46b7b-04ba-428c-b4b6-2f267773b5f2';
const fileName = 'binh/documents/1755248935279_1754653116085_test_1.mp3';

// Current URL generation logic from backend
const base64FileId = Buffer.from(fileName).toString('base64');
const downloadUrl = `http://localhost:3001/share/private/${shareId}/download/file/${base64FileId}`;

console.log('📁 Share ID:', shareId);
console.log('📄 File Name:', fileName);
console.log('🔢 Base64 File ID:', base64FileId);
console.log('🔗 Generated Download URL:', downloadUrl);

// Test URL decoding
const decodedPath = Buffer.from(base64FileId, 'base64').toString('utf-8');
console.log('🔓 Decoded Path:', decodedPath);

// Expected endpoint pattern
console.log('\n🎯 Expected Endpoint Match:');
console.log('Pattern: /share/private/:shareId/download/file/:fileId');
console.log('Actual:  /share/private/' + shareId + '/download/file/' + base64FileId);
