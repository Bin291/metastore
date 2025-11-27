# Video Chunking Application

This project is a video chunking application that allows users to upload large video files in smaller chunks, making the upload process more efficient and manageable. The application also supports streaming of the uploaded videos.

## Features

- **Chunked Uploads**: Upload large video files in smaller chunks to improve upload speed and reliability.
- **Video Streaming**: Stream uploaded videos directly to clients without needing to download the entire file.
- **Error Handling**: Robust error handling for uploads and streaming.
- **Progress Tracking**: Visual feedback on upload progress.

## Project Structure

```
video-chunking-app
├── src
│   ├── app.ts                  # Entry point of the application
│   ├── controllers             # Contains controllers for handling requests
│   │   ├── uploadController.ts  # Handles video uploads
│   │   └── streamController.ts  # Manages video streaming
│   ├── services                # Contains business logic and interactions
│   │   ├── chunkService.ts      # Splits video files into chunks
│   │   ├── minioService.ts      # Interacts with MinIO storage
│   │   └── videoProcessor.ts     # Processes uploaded videos
│   ├── middleware              # Middleware for handling requests
│   │   ├── uploadMiddleware.ts   # Validates uploads
│   │   └── errorHandler.ts       # Handles errors
│   ├── routes                  # Defines application routes
│   │   ├── uploadRoutes.ts       # Routes for uploading videos
│   │   └── streamRoutes.ts       # Routes for streaming videos
│   ├── config                  # Configuration files
│   │   ├── minio.ts             # MinIO configuration
│   │   └── index.ts             # Aggregates configuration
│   └── types                   # TypeScript types and interfaces
│       └── index.ts             # Common types
├── client                       # Client-side application
│   ├── src
│   │   ├── components           # React components
│   │   │   ├── VideoUploader.tsx # UI for uploading videos
│   │   │   ├── VideoPlayer.tsx   # Handles video playback
│   │   │   └── ProgressBar.tsx    # Displays upload progress
│   │   ├── services             # Client-side services
│   │   │   ├── chunkUploader.ts   # Manages chunk uploads
│   │   │   └── videoStream.ts     # Handles video streaming
│   │   └── App.tsx              # Main application component
│   └── package.json             # Client-side dependencies
├── package.json                 # Server-side dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd video-chunking-app
   ```

2. Install server dependencies:
   ```
   npm install
   ```

3. Navigate to the client directory and install client dependencies:
   ```
   cd client
   npm install
   ```

4. Configure MinIO settings in `src/config/minio.ts`.

## Usage

1. Start the server:
   ```
   npm start
   ```

2. Start the client:
   ```
   cd client
   npm start
   ```

3. Access the application in your browser at `http://localhost:3000`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.