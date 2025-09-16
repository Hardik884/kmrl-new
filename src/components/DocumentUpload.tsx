import { useState } from "react";
import {
  UploadCloud,
  File as FileIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type FileStatus = "pending" | "uploading" | "processing" | "completed" | "error";

interface UploadedFile {
  id: number;
  name: string;
  size: string;
  status: FileStatus;
  progress: number;
  classification?: string;
  confidence?: number;
}

const initialFiles: UploadedFile[] = [
  { id: 1, name: "Metro_Construction_Contract.pdf", size: "2.4 MB", status: "pending", progress: 0 },
  { id: 2, name: "Environmental_Impact_Report.docx", size: "1.8 MB", status: "pending", progress: 0 },
  { id: 3, name: "Technical_Drawings_Archive.zip", size: "15.2 MB", status: "pending", progress: 0 },
  { id: 4, name: "Station_Blueprint.png", size: "4.1 MB", status: "pending", progress: 0 },
];

const fileIcons: { [key: string]: React.ElementType } = {
  pdf: FileText,
  docx: FileText,
  png: FileImage,
  jpg: FileImage,
  xlsx: FileSpreadsheet,
  zip: FileArchive,
  default: FileIcon,
};

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || "default";
  return fileIcons[extension] || fileIcons.default;
};

export const DocumentUpload = () => {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const handleFileAction = () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) {
        toast({ title: "No files to upload", description: "All files have been processed." });
        return;
    }

    pendingFiles.forEach(file => {
        simulateUpload(file.id);
    });
  };

  const simulateUpload = (fileId: number) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: "uploading", progress: 0 } : f));

    const uploadInterval = setInterval(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === fileId && f.status === "uploading" && f.progress < 100) {
          const newProgress = f.progress + 20;
          return { ...f, progress: newProgress };
        }
        return f;
      }));
    }, 200);

    setTimeout(() => {
      clearInterval(uploadInterval);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: "processing", progress: 100 } : f));
      
      setTimeout(() => {
        const isError = Math.random() > 0.9;
        const fileName = files.find(f=>f.id === fileId)?.name || "File";
        setFiles(prev => prev.map(f => f.id === fileId ? { 
            ...f, 
            status: isError ? "error" : "completed",
            classification: isError ? undefined : ['Contract', 'Report', 'Drawing', 'Invoice'][Math.floor(Math.random() * 4)],
            confidence: isError ? undefined : Math.floor(Math.random() * 15) + 85,
        } : f));

        if (!isError) {
            toast({
                title: "Processing Complete",
                description: `"${fileName}" has been classified.`,
                variant: "default",
            });
        } else {
            toast({
                title: "Processing Error",
                description: `Failed to process "${fileName}".`,
                variant: "destructive",
            });
        }
      }, 1000 + Math.random() * 1000);
    }, 1200);
  };

  const StatusBadge = ({ status }: { status: FileStatus }) => {
    const statusConfig = {
      pending: { icon: <Loader2 className="animate-spin" />, text: "Pending", color: "bg-slate-100 text-slate-600" },
      uploading: { icon: <Loader2 className="animate-spin" />, text: "Uploading...", color: "bg-blue-100 text-blue-600" },
      processing: { icon: <Loader2 className="animate-spin" />, text: "Processing...", color: "bg-yellow-100 text-yellow-600" },
      completed: { icon: <CheckCircle2 />, text: "Completed", color: "bg-green-100 text-green-600" },
      error: { icon: <XCircle />, text: "Error", color: "bg-red-100 text-red-600" },
    };
    const { icon, text, color } = statusConfig[status];
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1.5 border-0", color)}>
        {icon}
        {text}
      </Badge>
    );
  };

  return (
    <section id="documents" className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="text-left space-y-2">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Smart Document Processing
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl">
            Upload documents for AI-powered classification, OCR, and automated workflow routing.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <Card 
            className={cn(
                "lg:col-span-1 border-2 border-dashed border-slate-300 shadow-none transition-all duration-300",
                isDragOver && "border-blue-500 bg-blue-50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileAction(); }}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4 h-full">
                <div className={cn(
                    "flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 transition-all duration-300",
                    isDragOver && "bg-blue-100 scale-110"
                )}>
                    <UploadCloud className={cn("h-8 w-8 text-slate-500", isDragOver && "text-blue-500")} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-800">
                        Drop files here or click to upload
                    </h3>
                    <p className="text-sm text-slate-500">
                        Supports PDF, DOCX, PNG, JPG, XLSX, ZIP
                    </p>
                </div>
                <Button 
                  variant="outline"
                  className="mt-4 bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
                  onClick={handleFileAction}
                >
                  Browse Files
                </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle>Processing Queue</CardTitle>
              <CardDescription>
                Monitor your documents as they are uploaded and processed by our AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => {
                    const Icon = getFileIcon(file.name);
                    return (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-slate-500" />
                            <span className="truncate">{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={file.status} />
                            {(file.status === 'uploading' || file.status === 'processing') && (
                                <Progress value={file.progress} className="h-1 w-24" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                            {file.status === 'completed' && file.classification && (
                                <div className="flex flex-col">
                                    <span className="font-medium text-slate-800">{file.classification}</span>
                                    <span className="text-xs text-slate-500">Confidence: {file.confidence}%</span>
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">{file.size}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};