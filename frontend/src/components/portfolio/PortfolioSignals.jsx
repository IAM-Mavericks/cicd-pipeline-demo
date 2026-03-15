import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const SignalItem = styled(Paper)(({ theme, severity }) => ({
  marginBottom: theme.spacing(1),
  borderLeft: `4px solid ${
    severity === 'high' ? theme.palette.error.main :
    severity === 'medium' ? theme.palette.warning.main :
    severity === 'low' ? theme.palette.info.main :
    theme.palette.success.main
  }`,
  '&:hover': {
    boxShadow: theme.shadows[2],
  },
}));

const getSeverityIcon = (severity, theme) => {
  const style = { fontSize: 20 };
  const color = 
    severity === 'high' ? 'error' :
    severity === 'medium' ? 'warning' :
    severity === 'low' ? 'info' : 'success';
  
  return (
    <Box color={`${color}.main`}>
      {severity === 'high' ? <ErrorOutlineIcon style={style} /> :
       severity === 'medium' ? <WarningAmberIcon style={style} /> :
       severity === 'low' ? <InfoOutlinedIcon style={style} /> :
       <CheckCircleOutlineIcon style={style} />}
    </Box>
  );
};

const PortfolioSignals = ({ signals = [] }) => {
  const theme = useTheme();

  if (!signals || signals.length === 0) {
    return null;
  }

  const groupedSignals = signals.reduce((acc, signal) => {
    if (!acc[signal.severity]) {
      acc[signal.severity] = [];
    }
    acc[signal.severity].push(signal);
    return acc;
  }, {});

  const severityOrder = ['high', 'medium', 'low', 'info'];
  const sortedSignals = [];
  
  severityOrder.forEach(severity => {
    if (groupedSignals[severity]) {
      sortedSignals.push(...groupedSignals[severity]);
    }
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Portfolio Signals
      </Typography>
      <List>
        {sortedSignals.map((signal, index) => (
          <SignalItem 
            key={index} 
            elevation={0}
            severity={signal.severity}
            sx={{ mb: 1 }}
          >
            <ListItem>
              <ListItemIcon>
                {getSeverityIcon(signal.severity, theme)}
              </ListItemIcon>
              <ListItemText
                primary={signal.title}
                primaryTypographyProps={{
                  variant: 'subtitle2',
                  color: 'text.primary',
                  fontWeight: 500,
                }}
                secondary={signal.message}
                secondaryTypographyProps={{
                  variant: 'body2',
                  color: 'text.secondary',
                }}
              />
              {signal.action && (
                <Box>
                  <Typography 
                    variant="caption" 
                    color="primary"
                    sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    onClick={signal.action.onClick}
                  >
                    {signal.action.label}
                  </Typography>
                </Box>
              )}
            </ListItem>
          </SignalItem>
        ))}
      </List>
    </Box>
  );
};

export default PortfolioSignals;
