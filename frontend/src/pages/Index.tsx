import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield,
  Zap,
  Globe,
  CreditCard,
  ArrowRight,
  Star,
  CheckCircle,
  Smartphone,
  Lock,
  TrendingUp,
  Binary
} from 'lucide-react';
import { FreshButtons } from '@/components/FreshButtons';
import { motion, useReducedMotion } from 'framer-motion';

// Then in your JSX:
<FreshButtons />
interface IndexProps {
  onNavigate: (page: string) => void;
}

export default function Index({ onNavigate }: IndexProps) {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast Transfers",
      description: "Send money instantly across Nigeria and internationally with our advanced payment infrastructure"
    },
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "Your money is protected with military-grade encryption and multi-factor authentication"
    },
    {
      icon: CreditCard,
      title: "Virtual Cards",
      description: "Create Verve, Visa, and Mastercard virtual cards instantly for online payments"
    },
    {
      icon: Binary,
      title: "Fortress of Trust",
      description: "Mathematically guaranteed privacy using Zero-Knowledge Proofs (ZKP) for identity verification."
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Send money to over 180 countries with competitive exchange rates"
    }
  ];

  const stats = [
    { number: "₦50B+", label: "Transactions Processed" },
    { number: "2M+", label: "Happy Users" },
    { number: "99.9%", label: "Uptime Guarantee" },
    { number: "24/7", label: "Customer Support" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        mass: 0.8,
      },
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
          <motion.div
            className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src="/dp-logo-small.svg" alt="SznPay Logo" className="w-10 h-10" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                SznPay
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => onNavigate('auth')}
              >
                Login
              </Button>
              <Button
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200"
                onClick={() => onNavigate('auth')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        className="relative z-10 pt-20 pb-32"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            variants={itemVariants}
          >
            <motion.h1
              className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent leading-tight"
              variants={itemVariants}
            >
              Connecting The Dots
              <br />
              In Payments
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              Experience lightning-fast payments, international transfers, and virtual cards
              like never before. Built for modern businesses, designed for the world.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              variants={itemVariants}
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-lg px-8 py-4 transform hover:scale-105 transition-all duration-200 shadow-2xl"
                onClick={() => onNavigate('auth')}
              >
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-4"
              >
                <Smartphone className="mr-2 h-5 w-5" />
                Download App
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        className="relative z-10 py-16"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={containerVariants}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                variants={itemVariants}
                whileHover={{ scale: shouldReduceMotion ? 1 : 1.05 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-400 text-sm md:text-base">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Revolutionary Features
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Experience the next generation of financial technology with features that redefine digital banking
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className={`bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                  onClick={() => feature.title === "Fortress of Trust" ? onNavigate('privacy') : null}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                    <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <motion.section
        className="relative z-10 py-20 bg-black/20 backdrop-blur-sm"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid lg:grid-cols-2 gap-12 items-center"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <motion.h2
                className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent"
                variants={itemVariants}
              >
                Security First,
                <br />
                Always
              </motion.h2>
              <motion.p
                className="text-xl text-gray-300 mb-8 leading-relaxed"
                variants={itemVariants}
              >
                Your financial security is our top priority. We use advanced encryption,
                biometric authentication, and real-time fraud detection to keep your money safe.
              </motion.p>
              <motion.div
                className="space-y-4"
                variants={containerVariants}
              >
                {[
                  "256-bit SSL Encryption",
                  "Biometric Authentication",
                  "Real-time Fraud Detection",
                  "Multi-factor Authentication"
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-3"
                    variants={itemVariants}
                  >
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <span className="text-gray-300">{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
            <motion.div
              className="relative"
              variants={itemVariants}
              whileHover={{ scale: shouldReduceMotion ? 1 : 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="w-full h-96 bg-gradient-to-r from-green-500/20 to-blue-600/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                <Lock className="h-24 w-24 text-white/50" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Ready to Transform Your
            <br />
            Financial Experience?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join millions of users who trust SznPay for their daily financial needs.
            Get started in less than 5 minutes.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-lg px-12 py-4 transform hover:scale-105 transition-all duration-200 shadow-2xl"
            onClick={() => onNavigate('auth')}
          >
            Create Your Account
            <TrendingUp className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        className="relative z-10 bg-black/40 backdrop-blur-md border-t border-white/10 py-12"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            variants={itemVariants}
          >
            <motion.h3
              className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-4"
              variants={itemVariants}
            >
              SznPay
            </motion.h3>
            <motion.p
              className="text-gray-400 mb-4"
              variants={itemVariants}
            >
              Connecting The Dots In Payments
            </motion.p>
            <motion.div
              className="flex justify-center space-x-6 text-gray-400"
              variants={itemVariants}
            >
              <span>© 2024 SznPay. All rights reserved.</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.footer>
    </motion.div>
  );
}
