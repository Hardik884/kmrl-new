import {
  Train,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  PlusCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const projects = [
    {
      id: 1,
      name: "Kochi Metro Phase II",
      status: "In Progress",
      progress: 78,
      startDate: "Jan 2024",
      endDate: "Dec 2025",
      documents: 1247,
      team: [
        { name: "Aarav Patel", avatar: "/avatars/01.png" },
        { name: "Priya Singh", avatar: "/avatars/02.png" },
        { name: "Rohan Gupta", avatar: "/avatars/03.png" },
      ],
      priority: "High",
    },
    {
      id: 2,
      name: "Feeder Bus Integration",
      status: "Planning",
      progress: 45,
      startDate: "Mar 2024",
      endDate: "Jun 2025",
      documents: 543,
      team: [
        { name: "Sneha Sharma", avatar: "/avatars/04.png" },
        { name: "Vikram Reddy", avatar: "/avatars/05.png" },
      ],
      priority: "Medium",
    },
    {
      id: 3,
      name: "Digital Ticketing System",
      status: "Testing",
      progress: 92,
      startDate: "Sep 2023",
      endDate: "Mar 2024",
      documents: 234,
      team: [
        { name: "Ananya Iyer", avatar: "/avatars/01.png" },
        { name: "Karan Mehta", avatar: "/avatars/02.png" },
      ],
      priority: "High",
    },
    {
      id: 4,
      name: "Station Accessibility Upgrade",
      status: "Completed",
      progress: 100,
      startDate: "May 2024",
      endDate: "Nov 2024",
      documents: 678,
      team: [
        { name: "Fatima Khan", avatar: "/avatars/03.png" },
        { name: "David D'souza", avatar: "/avatars/04.png" },
      ],
      priority: "Medium",
    },
];

const statusConfig = {
  "In Progress": { icon: Clock, color: "bg-blue-100 text-blue-600 border-blue-200" },
  "Planning": { icon: Calendar, color: "bg-yellow-100 text-yellow-600 border-yellow-200" },
  "Testing": { icon: AlertTriangle, color: "bg-orange-100 text-orange-600 border-orange-200" },
  "Completed": { icon: CheckCircle, color: "bg-green-100 text-green-600 border-green-200" },
};

const priorityConfig = {
  "High": "border-red-500",
  "Medium": "border-yellow-500",
  "Low": "border-green-500",
};

export const ProjectOverview = () => {
  return (
    <section id="projects" className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
            <div className="text-left space-y-2">
                <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                    Project Hub
                </h2>
                <p className="text-lg text-slate-600 max-w-3xl">
                    Comprehensive oversight of metro projects with document-driven progress tracking.
                </p>
            </div>
            <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Project
            </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {projects.map((project) => {
            const StatusIcon = statusConfig[project.status as keyof typeof statusConfig].icon;
            const statusColor = statusConfig[project.status as keyof typeof statusConfig].color;
            const priorityBorder = priorityConfig[project.priority as keyof typeof priorityConfig];

            return (
              <Card key={project.id} className={`border-l-4 ${priorityBorder} shadow-sm hover:shadow-lg transition-shadow duration-300`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Train className="h-5 w-5 text-slate-500" />
                        {project.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        {project.startDate} - {project.endDate}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Project</DropdownMenuItem>
                        <DropdownMenuItem>Manage Team</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-600">Progress</span>
                      <span className="font-bold text-slate-800">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/80">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-600">{project.documents} docs</span>
                        </div>
                        <Badge variant="outline" className={statusColor}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {project.status}
                        </Badge>
                    </div>
                    <div className="flex items-center -space-x-2">
                        <TooltipProvider>
                        {project.team.map((member, index) => (
                            <Tooltip key={index}>
                                <TooltipTrigger asChild>
                                    <img
                                        className="inline-block h-8 w-8 rounded-full ring-2 ring-white"
                                        src={`https://i.pravatar.cc/32?u=${member.name}`}
                                        alt={member.name}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{member.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                        </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};