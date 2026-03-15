import React from 'react';
import { Box, Typography, Paper, Grid, useTheme } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { styled } from '@mui/material/styles';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
}));

const PerformanceMetric = ({ title, value, change, isPositive }) => (
  <Box textAlign="center" p={2}>
    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
      {title}
    </Typography>
    <Typography 
      variant="h6" 
      color={change !== undefined ? (isPositive ? 'success.main' : 'error.main') : 'textPrimary'}
      gutterBottom
    >
      {value}
    </Typography>
    {change !== undefined && (
      <Typography 
        variant="caption" 
        color={isPositive ? 'success.main' : 'error.main'}
        sx={{ 
          display: 'inline-flex',
          alignItems: 'center',
          bgcolor: isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          px: 1,
          py: 0.5,
          borderRadius: 1
        }}
      >
        {isPositive ? '↑' : '↓'} {Math.abs(change)}%
      </Typography>
    )}
  </Box>
);

const PortfolioPerformance = ({ performance }) => {
  const theme = useTheme();

  // Prepare performance chart data
  const chartData = {
    labels: performance?.historicalPerformance?.labels || [],
    datasets: [
      {
        label: 'Portfolio',
        data: performance?.historicalPerformance?.values || [],
        borderColor: theme.palette.primary.main,
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: 'Benchmark',
        data: performance?.benchmarkPerformance?.values || [],
        borderColor: theme.palette.secondary.main,
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += `${context.parsed.y.toFixed(2)}%`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Performance
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <PerformanceMetric 
            title="1M Return" 
            value={`${performance?.returns?.oneMonth?.toFixed(2) || '0.00'}%`}
            change={performance?.returns?.oneMonth}
            isPositive={performance?.returns?.oneMonth >= 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <PerformanceMetric 
            title="YTD Return" 
            value={`${performance?.returns?.ytd?.toFixed(2) || '0.00'}%`}
            change={performance?.returns?.ytd}
            isPositive={performance?.returns?.ytd >= 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <PerformanceMetric 
            title="1Y Return" 
            value={`${performance?.returns?.oneYear?.toFixed(2) || '0.00'}%`}
            change={performance?.returns?.oneYear}
            isPositive={performance?.returns?.oneYear >= 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <PerformanceMetric 
            title="Max Drawdown" 
            value={`${performance?.maxDrawdown?.toFixed(2) || '0.00'}%`}
          />
        </Grid>
      </Grid>

      <StyledPaper>
        <Box height={400}>
          {performance?.historicalPerformance?.values?.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center" 
              height="100%"
            >
              <Typography color="textSecondary">No performance data available</Typography>
            </Box>
          )}
        </Box>
      </StyledPaper>

      {performance?.topPerformers && performance.topPerformers.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Top Performers
          </Typography>
          <Grid container spacing={2}>
            {performance.topPerformers.map((performer, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2">{performer.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {performer.symbol}
                      </Typography>
                    </Box>
                    <Typography 
                      variant="subtitle1" 
                      color={performer.return >= 0 ? 'success.main' : 'error.main'}
                    >
                      {performer.return >= 0 ? '+' : ''}{performer.return.toFixed(2)}%
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default PortfolioPerformance;
