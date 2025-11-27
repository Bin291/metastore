# MinIO File Chunker

This project provides a solution for efficiently uploading and chunking large files to a MinIO server. It is built using TypeScript and Express, ensuring a robust and scalable file upload process.

## Features

- Chunking of large files to prevent memory overload.
- Uploading file chunks to a MinIO server.
- Finalization of uploads by merging chunks if necessary.
- Middleware for handling file uploads and validating requests.

## Project Structure

```
minio-file-chunker
├── src
│   ├── app.ts                  # Entry point of the application
│   ├── config
│   │   └── minio.config.ts     # Configuration for MinIO connection
│   ├── controllers
│   │   └── upload.controller.ts # Handles file upload logic
│   ├── services
│   │   ├── chunking.service.ts  # Manages file chunking
│   │   └── minio.service.ts     # Interacts with MinIO for uploads
│   ├── middlewares
│   │   └── upload.middleware.ts  # Middleware for file uploads
│   ├── routes
│   │   └── upload.routes.ts     # Defines upload routes
│   └── types
│       └── index.ts             # Type definitions
├── package.json                 # npm configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd minio-file-chunker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure MinIO settings in `src/config/minio.config.ts`:
   - Set your MinIO `endpoint`, `accessKey`, `secretKey`, and `bucketName`.

## Usage

1. Start the application:
   ```
   npm start
   ```

2. Use the defined routes to upload files. The application will handle chunking and uploading to MinIO automatically.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.