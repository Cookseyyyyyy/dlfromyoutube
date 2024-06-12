import React, { useState } from 'react';
import axios from 'axios';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (type: 'video' | 'audio') => {
    setLoading(true);
    setError(null);

    try {
      console.log('Downloading from URL:', url);
      const response = await axios.get('http://localhost:4000/download', {
        params: { url, type },
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'];
      console.log('Content-Disposition Header:', contentDisposition);

      const fileNameMatch = contentDisposition && contentDisposition.match(/filename="(.+?)"/);
      const fileName = fileNameMatch ? fileNameMatch[1] : (type === 'video' ? 'video.mp4' : 'audio.wav');

      console.log('Determined file name:', fileName);

      const urlBlob = window.URL.createObjectURL(new Blob([response.data], { type: type === 'video' ? 'video/mp4' : 'audio/wav' }));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error during download:', error);
      setError('Failed to download the media. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>YouTube Downloader</h1>
      <input
        type="text"
        placeholder="Enter YouTube URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: '300px', padding: '10px', marginBottom: '20px' }}
      />
      <br />
      <button onClick={() => handleDownload('video')} disabled={loading} style={{ padding: '10px 20px', marginRight: '10px' }}>
        {loading ? 'Downloading...' : 'Download Video (with audio)'}
      </button>
      <button onClick={() => handleDownload('audio')} disabled={loading} style={{ padding: '10px 20px' }}>
        {loading ? 'Downloading...' : 'Download Audio Only'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default App;
