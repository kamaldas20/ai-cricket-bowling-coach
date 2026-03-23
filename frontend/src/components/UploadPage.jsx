import React from 'react';
import { useDropzone } from 'react-dropzone';

const UploadPage = () => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: 'video/*',
    onDrop: (acceptedFiles) => {
      // Handle file upload
      console.log(acceptedFiles);
    },
  });

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div {...getRootProps({ className: 'dropzone border-2 border-dashed border-gray-400 p-6 rounded-lg bg-white' })}>
        <input {...getInputProps()} />
        {
          isDragActive ? (
            <p>Drop the videos here ...</p>
          ) : (
            <p>Drag 'n' drop some video files here, or click to select files</p>
          )
        }
      </div>
    </div>
  );
};

export default UploadPage;
