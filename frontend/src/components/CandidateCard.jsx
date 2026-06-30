import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Radio,
  Box,
  Avatar,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { API_BASE_URL } from '../utils/constants';

const CandidateCard = ({ candidate, selected, onSelect, position }) => {
  const photoUrl = candidate.photo
    ? candidate.photo.startsWith('http')
      ? candidate.photo
      : `${API_BASE_URL}/uploads/${candidate.photo}`
    : null;

  return (
    <Card
      sx={{
        border: selected ? '2px solid' : '2px solid transparent',
        borderColor: selected ? '#16a34a' : 'transparent',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
        bgcolor: selected ? 'rgba(22, 163, 74, 0.05)' : 'background.paper',
      }}
    >
      <CardActionArea onClick={() => onSelect(candidate.id)} sx={{ p: 2 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
          <Avatar
            src={photoUrl}
            alt={candidate.fullname}
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'primary.light',
              border: '2px solid',
              borderColor: selected ? 'primary.main' : 'divider',
            }}
          >
            {!photoUrl && <PersonIcon sx={{ fontSize: 40 }} />}
          </Avatar>
          <Box textAlign="center" flex={1}>
            <Typography variant="subtitle1" fontWeight="bold">
              {candidate.fullname}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {position}
            </Typography>
          </Box>
          <Radio
            checked={selected}
            onChange={() => onSelect(candidate.id)}
            sx={{
              color: 'primary.light',
              '&.Mui-checked': { color: '#16a34a' },
              '& .MuiSvgIcon-root': { fontSize: 28 },
            }}
          />
        </Box>
      </CardActionArea>
    </Card>
  );
};

export default CandidateCard;
