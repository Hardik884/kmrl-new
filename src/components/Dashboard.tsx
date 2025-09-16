import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  FileText,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Database,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const kpiData = [
  {
    title: "Docs Processed Today",
    value: "2,847",
    change: "+12.5%",
    icon: FileText,
    color: "text-blue-500",
  },
  {
    title: "AI Accuracy",
    value: "99.8%",
    change: "+0.3%",
    icon: CheckCircle,
    color: "text-green-500",
  },
  {
    title: "Avg. Processing Time",
    value: "0.8s",
    change: "-15%",
    icon: Clock,
    color: "text-orange-500",
  },
  {
    title: "Active Projects",
    value: "47",
    change: "+3",
    icon: BarChart3,
    color: "text-purple-500",
  },
];

const chartData = [
  { name: "Jan", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Feb", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Mar", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Apr", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "May", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Jun", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Jul", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Aug", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Sep", total: Math.floor(Math.random() * 5000) + 1000 },
];

const classificationData = [
    { name: 'Contracts', value: 400, fill: 'var(--color-contracts)' },
    { name: 'Invoices', value: 300, fill: 'var(--color-invoices)' },
    { name: 'Reports', value: 200, fill: 'var(--color-reports)' },
    { name: 'Permits', value: 278, fill: 'var(--color-permits)' },
    { name: 'Drawings', value: 189, fill: 'var(--color-drawings)' },
];

const recentActivity = [
    { type: "contract", title: "Metro Line 2 Construction Contract", status: "approved", time: "2 min ago" },
    { type: "permit", title: "Environmental Clearance Document", status: "pending", time: "5 min ago" },
    { type: "technical", title: "Track Design Specifications", status: "processed", time: "12 min ago" },
    { type: "report", title: "Monthly Safety Audit Report", status: "reviewed", time: "18 min ago" },
];

const projectProgress = [
    { name: "Kochi Metro Phase II", progress: 78, color: "bg-blue-500" },
    { name: "Feeder Bus Integration", progress: 45, color: "bg-orange-500" },
    { name: "Digital Ticketing System", progress: 92, color: "bg-green-500" },
];

export const Dashboard = () => {
  return (
    <section id="dashboard" className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-left space-y-2">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Executive Dashboard
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl">
            Real-time insights into document processing, AI performance, and project metrics.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi, index) => (
            <Card key={index} className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {kpi.value}
                </div>
                <p className="text-xs text-slate-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500"/>
                  {kpi.change} vs last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Documents Overview Chart */}
          <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle>Documents Processed Overview</CardTitle>
              <CardDescription>Monthly trend of processed documents.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(5px)',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Document Classification Chart */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle>Document Classification</CardTitle>
              <CardDescription>Breakdown by document type.</CardDescription>
            </CardHeader>
            <CardContent>
                <style>{`
                    :root {
                        --color-contracts: #3b82f6;
                        --color-invoices: #84cc16;
                        --color-reports: #f97316;
                        --color-permits: #eab308;
                        --color-drawings: #8b5cf6;
                    }
                `}</style>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classificationData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} width={80} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(5px)',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
                <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-slate-500" />
                    <span>Recent Document Activity</span>
                </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50/70 rounded-lg">
                        <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${projectProgress.find(p => p.name.toLowerCase().includes(activity.type))?.color || 'bg-slate-400'}`}></div>
                        <div>
                            <p className="font-medium text-slate-800">{activity.title}</p>
                            <p className="text-sm text-slate-500">{activity.time}</p>
                        </div>
                        </div>
                        <Badge
                        variant={activity.status === "approved" ? "default" : "secondary"}
                        className={
                            activity.status === "approved"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : activity.status === "pending"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                            : "bg-slate-100 text-slate-800 border-slate-200"
                        }
                        >
                        {activity.status}
                        </Badge>
                    </div>
                    ))}
                </div>
                </CardContent>
            </Card>

            {/* Project Progress */}
            <Card className="border-slate-200/80 shadow-sm">
                <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-slate-500" />
                    <span>Project Progress</span>
                </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-6">
                    {projectProgress.map((project, index) => (
                    <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{project.name}</span>
                        <span className="text-slate-500">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} indicatorClassName={project.color} className="h-2" />
                    </div>
                    ))}
                </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </section>
  );
};