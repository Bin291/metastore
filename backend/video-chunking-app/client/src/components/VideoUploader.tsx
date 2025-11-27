import React, { useState } from 'react';
import { uploadChunks } from '../services/chunkUploader';
import ProgressBar from './ProgressBar';

const VideoUploader: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploadProgress(0);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            await uploadChunks(file, (progress: number) => {
                setUploadProgress(progress);
            });
            alert('Upload successful!');
        } catch (err) {
            setError('Upload failed. Please try again.');
        }
    };

    return (
        <div>
            <h2>Upload Video</h2>
            <input type="file" accept="video/*" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={!file}>
                Upload
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <ProgressBar progress={uploadProgress} />
        </div>
    );
};

export default VideoUploader;