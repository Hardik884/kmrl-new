import { ArrowRight, Shield, Zap, Brain, FileSearch, Sparkles, TrendingUp, Clock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import heroBackground from "@/assets/metro-hero-bg.jpg";

export const HeroSection = () => {
  const features = [
    { icon: Brain, text: "AI-Powered Classification", color: "text-blue-500" },
    { icon: Shield, text: "Enterprise Security", color: "text-green-500" },
    { icon: Zap, text: "Real-time Processing", color: "text-yellow-500" },
    { icon: FileSearch, text: "Advanced Search", color: "text-purple-500" },
  ];

  const stats = [
    { value: "10M+", label: "Documents Processed", icon: Database, color: "text-blue-600" },
    { value: "99.8%", label: "Accuracy Rate", icon: TrendingUp, color: "text-green-600" },
    { value: "50x", label: "Faster Processing", icon: Clock, color: "text-orange-600" },
    { value: "24/7", label: "System Uptime", icon: Sparkles, color: "text-purple-600" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Sophisticated Background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50"></div>
        
        {/* Hero image with overlay */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBackground})` }}
          ></div>
        </div>
        
        {/* Animated geometric elements */}
        <div className="absolute top-1/4 left-1/6 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/6 w-96 h-96 bg-gradient-to-r from-purple-400/15 to-pink-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-300/10 to-blue-300/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center space-y-12">
          {/* Modern Badge */}
          <div className="flex justify-center">
            <Card className="border-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-sm">
              <CardContent className="px-6 py-3">
                <Badge variant="secondary" className="bg-transparent border-0 text-blue-700 font-semibold">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Next-Generation Document Management Platform
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Heading */}
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block text-slate-900 leading-tight">
                Automated Document 
              </span>
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                Overload Solution
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed font-light">
              Transforming Kochi Metro Rail Limited's document management with AI-powered 
              classification, real-time processing, and intelligent workflow automation.
            </p>
          </div>

          {/* Modern Feature Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 hover:scale-105 group">
                <CardContent className="p-6 text-center">
                  <feature.icon className={`h-8 w-8 mx-auto mb-3 ${feature.color} group-hover:scale-110 transition-transform duration-300`} />
                  <span className="text-sm font-medium text-slate-700 leading-tight">{feature.text}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enhanced CTA Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-lg font-semibold transition-all duration-300"
            >
              Watch Demo
            </Button>
          </div>

          <Separator className="max-w-24 mx-auto" />

          {/* Modern Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={index} className="border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color} group-hover:scale-110 transition-transform duration-300`} />
                  <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Subtle bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
    </section>
  );
};

