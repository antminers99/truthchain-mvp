import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWallet } from "@/contexts/WalletContext";
import { WalletButton } from "@/components/WalletButton";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, Upload, Database, FileText, Image, Video, Copy, Check, Loader2, CloudUpload, Wallet } from "lucide-react";
import type { NewsRecord } from "@shared/schema";

interface PrepareUploadResponse {
  success: boolean;
  cid: string;
  hash: string;
  timestamp: string;
  fileName: string;
  fileType: string;
}

export default function HomePage() {
  const [newsText, setNewsText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [progressValue, setProgressValue] = useState(0);
  const [copiedField, setCopiedField] = useState<string>("");
  const { toast } = useToast();
  const { isConnected, isPolygonMainnet, address, signAndSendTransaction, connect } = useWallet();

  const { data: records = [], isLoading: recordsLoading } = useQuery<NewsRecord[]>({
    queryKey: ["/api/records"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const text = formData.get('text') as string;
      
      // Step 1: Prepare upload (IPFS + hash)
      setUploadProgress("جاري الرفع إلى IPFS...");
      setProgressValue(25);
      
      const prepareResponse = await apiRequest("POST", "/api/prepare-upload", formData) as PrepareUploadResponse;
      
      if (!prepareResponse.success) {
        throw new Error("فشل التحضير");
      }

      // Step 2: Sign and send blockchain transaction
      setUploadProgress("يرجى توقيع المعاملة في MetaMask...");
      setProgressValue(50);
      
      const txHash = await signAndSendTransaction(prepareResponse.hash, prepareResponse.cid);
      
      setUploadProgress("جاري حفظ السجل...");
      setProgressValue(75);

      // Step 3: Save record to database
      const saveResponse = await apiRequest("POST", "/api/save-record", {
        text,
        cid: prepareResponse.cid,
        hash: prepareResponse.hash,
        tx: txHash,
        fileName: prepareResponse.fileName,
        fileType: prepareResponse.fileType,
        timestamp: prepareResponse.timestamp,
        walletAddress: address,
      });

      setProgressValue(100);
      return saveResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records"] });
      setNewsText("");
      setSelectedFile(null);
      setUploadProgress("");
      setProgressValue(0);
      toast({
        title: "تم التحقق بنجاح!",
        description: "تم تسجيل الخبر على البلوكتشين",
      });
    },
    onError: (error: Error) => {
      setUploadProgress("");
      setProgressValue(0);
      toast({
        variant: "destructive",
        title: "فشل الرفع",
        description: error.message || "حدث خطأ غير متوقع",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast({
        variant: "destructive",
        title: "المحفظة غير متصلة",
        description: "يرجى ربط محفظة MetaMask أولاً",
      });
      return;
    }

    if (!isPolygonMainnet) {
      toast({
        variant: "destructive",
        title: "شبكة خاطئة",
        description: "يرجى التبديل إلى شبكة Polygon",
      });
      return;
    }

    if (!newsText.trim() || !selectedFile) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "يرجى إدخال النص وإرفاق ملف",
      });
      return;
    }

    const formData = new FormData();
    formData.append("text", newsText);
    formData.append("file", selectedFile);

    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/webm"];
      if (!validTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "نوع ملف غير مدعوم",
          description: "يرجى رفع صورة (JPG, PNG, GIF) أو فيديو (MP4, WebM)",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
    toast({
      description: "تم النسخ",
    });
  };

  const truncate = (str: string, length: number) => {
    return str.length > length ? `${str.substring(0, length)}...` : str;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b py-4">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">TruthChain</h1>
                <p className="text-sm text-muted-foreground">Decentralized News Verification</p>
              </div>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">تحقق من الأخبار بتقنية البلوكتشين</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            ارفع المحتوى مع ملفات الوسائط. نخزنها على IPFS، وننشئ بصمات تشفيرية، ونسجل التحقق بشكل دائم على شبكة Polygon.
          </p>
          <div className="flex items-center justify-center gap-8 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="font-medium">{records.length} سجل موثق</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">Polygon</Badge>
              <span className="text-muted-foreground">+</span>
              <Badge variant="outline" className="font-mono">IPFS</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Connection Notice */}
      {!isConnected && (
        <section className="py-6">
          <div className="max-w-2xl mx-auto px-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between gap-4 py-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-medium">ربط المحفظة مطلوب</p>
                    <p className="text-sm text-muted-foreground">قم بربط MetaMask للتحقق من الأخبار على البلوكتشين</p>
                  </div>
                </div>
                <Button onClick={connect} data-testid="button-connect-wallet-notice">
                  ربط MetaMask
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Upload Section */}
      <section className="py-12">
        <div className="max-w-2xl mx-auto px-6">
          <Card data-testid="card-upload-form">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CloudUpload className="w-5 h-5 text-primary" />
                <CardTitle>رفع خبر للتحقق</CardTitle>
              </div>
              <CardDescription>ارفع المحتوى مع ملف وسائط لإنشاء سجل دائم</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="text-input" className="text-sm font-medium uppercase tracking-wide">نص الخبر</Label>
                  <Textarea
                    id="text-input"
                    data-testid="input-news-text"
                    placeholder="أدخل محتوى الخبر الذي تريد التحقق منه..."
                    value={newsText}
                    onChange={(e) => setNewsText(e.target.value)}
                    rows={5}
                    className="resize-none"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-input" className="text-sm font-medium uppercase tracking-wide">ملف الوسائط</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate transition-colors">
                    <Input
                      id="file-input"
                      data-testid="input-file"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,video/mp4,video/webm"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="file-input" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-medium mb-1">
                        {selectedFile ? selectedFile.name : "اسحب الملف هنا أو انقر للاختيار"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        صور: JPG, PNG, GIF | فيديو: MP4, WebM
                      </p>
                    </label>
                  </div>
                </div>

                {uploadProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{uploadProgress}</span>
                    </div>
                    <Progress value={progressValue} />
                  </div>
                )}

                <Button
                  type="submit"
                  data-testid="button-submit"
                  disabled={uploadMutation.isPending || !isConnected || !isPolygonMainnet}
                  className="w-full"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جاري التحقق...
                    </>
                  ) : !isConnected ? (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      ربط المحفظة أولاً
                    </>
                  ) : !isPolygonMainnet ? (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      التبديل إلى Polygon
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      تحقق وأرسل
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Records Section */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <Card data-testid="card-records">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <CardTitle>السجلات الموثقة</CardTitle>
                </div>
                <Badge variant="secondary" data-testid="badge-record-count">
                  {records.length} {records.length === 1 ? "سجل" : "سجلات"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium">لا توجد سجلات بعد</p>
                  <p className="text-sm text-muted-foreground mt-1">قم برفع أول خبر للتحقق منه</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الوقت</TableHead>
                        <TableHead>النص</TableHead>
                        <TableHead>الوسائط</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>تفاصيل التحقق</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id} data-testid={`row-record-${record.id}`} className="hover-elevate">
                          <TableCell className="whitespace-nowrap">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="truncate" title={record.text}>
                              {truncate(record.text, 60)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {record.fileType?.startsWith("image/") ? (
                                <Image className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <Video className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">{record.fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              موثق
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">IPFS:</span>
                                <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                                  {truncate(record.cid, 12)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(record.cid, `cid-${record.id}`)}
                                  data-testid={`button-copy-cid-${record.id}`}
                                >
                                  {copiedField === `cid-${record.id}` ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                              {record.tx && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">TX:</span>
                                  <a 
                                    href={`https://polygonscan.com/tx/${record.tx}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono bg-muted px-1 py-0.5 rounded hover:underline"
                                  >
                                    {truncate(record.tx, 12)}
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(record.tx!, `tx-${record.id}`)}
                                    data-testid={`button-copy-tx-${record.id}`}
                                  >
                                    {copiedField === `tx-${record.id}` ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Hash:</span>
                                <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                                  {truncate(record.hash, 12)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(record.hash, `hash-${record.id}`)}
                                  data-testid={`button-copy-hash-${record.id}`}
                                >
                                  {copiedField === `hash-${record.id}` ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>TruthChain MVP</span>
              <span>•</span>
              <span>MIT License</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">Polygon Mainnet</Badge>
              <span>+</span>
              <Badge variant="outline" className="font-mono">IPFS</Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
