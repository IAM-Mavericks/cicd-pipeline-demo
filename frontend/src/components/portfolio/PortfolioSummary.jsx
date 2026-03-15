import React from 'react';
import { Box, Card, CardContent, Typography, Grid, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const PortfolioSummary = ({ data }) => {
  const theme = useTheme();
  const isPositive = data.totalReturnPct >= 0;
  
  const stats = [
    {
      title: 'Portfolio Value',
      value: `₦${data.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <AccountBalanceWalletIcon fontSize="large" color="primary" />,
      change: null
    },
    {
      title: 'Total Return',
      value: `${isPositive ? '+' : ''}${data.totalReturnPct?.toFixed(2)}%`,
      valueColor: isPositive ? 'success.main' : 'error.main',
      icon: isPositive ? 
        <TrendingUpIcon fontSize="large" color="success" /> : 
        <TrendingDownIcon fontSize="large" color="error" />,
      change: data.totalReturnPct
    },
    {
      title: 'Risk Level',
      value: data.riskLevel ? data.riskLevel.charAt(0).toUpperCase() + data.riskLevel.slice(1) : 'N/A',
      icon: <EqualizerIcon fontSize="large" color="warning" />,
      chip: true,
      chipColor: data.riskLevel === 'high' ? 'error' : 
                data.riskLevel === 'medium' ? 'warning' : 'success'
    },
    {
      title: 'Diversification',
      value: data.diversificationScore ? `${data.diversificationScore}/100` : 'N/A',
      icon: <EqualizerIcon fontSize="large" color="info" />,
      progress: data.diversificationScore || 0
    }
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Portfolio Summary
      </Typography>
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography 
                      variant="h5" 
                      component="div" 
                      color={stat.valueColor || 'textPrimary'}
                    >
                      {stat.value}
                    </Typography>
                    {stat.change !== null && (
                      <Typography 
                        variant="caption" 
                        color={isPositive ? 'success.main' : 'error.main'}
                        sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}
                      >
                        {isPositive ? '+' : ''}{stat.change?.toFixed(2)}% all time
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    {stat.icon}
                  </Box>
                </Box>
                {stat.chip && (
                  <Box 
                    component="span" 
                    sx={{
                      display: 'inline-block',
                      bgcolor: `${stat.chipColor}.light`,
                      color: `${stat.chipColor}.contrastText`,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 'medium'
                    }}
                  >
                    {stat.value}
                  </Box>
                )}
                {stat.progress !== undefined && (
                  <Box mt={2}>
                    <Box 
                      sx={{ 
                        width: '100%', 
                        height: 8, 
                        bgcolor: 'grey.200',
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: `${stat.progress}%`, 
                          height: '100%', 
                          bgcolor: 'primary.main'
                        }} 
                      />
                    </Box>
                    <Box display="flex" justifyContent="space-between" mt={0.5}>
                      <Typography variant="caption" color="textSecondary">
                        {stat.progress < 30 ? 'Low' : stat.progress < 70 ? 'Moderate' : 'High'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {stat.progress}%
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </StatCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PortfolioSummary;
