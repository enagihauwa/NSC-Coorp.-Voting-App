import { useRef, useState, useCallback } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const IdCardUpload = ({ onCapture, onClear }) => {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFileError('Please upload an image file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Image is too large. Please upload a file under 5 MB.');
      return;
    }
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);
      onCapture?.(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [onCapture]);

  const handleChange = useCallback((e) => {
    handleFile(e.target.files?.[0]);
  }, [handleFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer?.files?.[0]);
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setFileError(null);
    onClear?.();
    if (inputRef.current) inputRef.current.value = '';
  }, [onClear]);

  if (preview) {
    return (
      <Box textAlign="center">
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <Box
            component="img"
            src={preview}
            alt="Staff ID Card"
            sx={{ width: '100%', maxWidth: 360, borderRadius: 2, border: '2px solid', borderColor: 'primary.main' }}
          />
          <IconButton
            size="small"
            onClick={handleRemove}
            sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'error.main', color: '#fff', '&:hover': { bgcolor: 'error.dark' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography variant="caption" color="primary.main" fontWeight={600} display="block" mt={1}>
          Staff ID Card uploaded
        </Typography>
        <Button size="small" component="label" sx={{ mt: 1, color: 'text.secondary' }}>
          Change file
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
        </Button>
      </Box>
    );
  }

  return (
    <Box
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      sx={{
        textAlign: 'center', p: 4, borderRadius: 2, border: '2px dashed', borderColor: 'divider',
        bgcolor: 'action.hover', cursor: 'pointer', transition: 'border-color 0.2s',
        '&:hover': { borderColor: 'primary.main' },
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
      <Typography variant="body1" fontWeight={600}>Upload Staff ID Card</Typography>
      <Typography variant="caption" color="text.secondary">Click or drag & drop an image of your staff ID card</Typography>
      {fileError && (
        <Typography variant="caption" color="error" display="block" mt={1} fontWeight={600}>
          {fileError}
        </Typography>
      )}
    </Box>
  );
};

export default IdCardUpload;
