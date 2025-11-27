import React from 'react';
import VideoUploader from './components/VideoUploader';
import VideoPlayer from './components/VideoPlayer';
import { useState } from 'react';

const App: React.FC = () => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const handleVideoUpload = (url: string) => {
        setVideoUrl(url);
    };

    return (
        <div>
            <h1>Video Chunking App</h1>
            <VideoUploader onUpload={handleVideoUpload} />
            {videoUrl && <VideoPlayer videoUrl={videoUrl} />}
        </div>
    );
};

export default App;