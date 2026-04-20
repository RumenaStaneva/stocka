"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Camera, X, FileImage, Loader2 } from "lucide-react";
import Image from "next/image";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback((selectedFile: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Невалиден тип файл. Моля, качете JPEG, PNG, WebP или PDF.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Размерът на файла надвишава лимита от 10MB.");
      return;
    }

    setFile(selectedFile);
    setError("");

    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError("");
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      // Upload file to Blob storage
      const uploadResult = await api.uploadFile(file);
      
      // Create invoice record
      const invoiceResult = await api.createInvoice({
        image_url: uploadResult.data.url,
        image_filename: uploadResult.data.filename,
      });

      // Redirect to extraction/review page
      router.push(`/invoices/${invoiceResult.data.id}/extract`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Качи фактура</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          Качете изображение на фактура за извличане на данни с AI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Избери файл</CardTitle>
          <CardDescription>
            Плъзнете и пуснете или кликнете за избор. Поддържа JPEG, PNG, WebP, PDF (макс. 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div className="space-y-4">
              {/* Camera Button - Prominent on Mobile */}
              <label className="flex items-center justify-center gap-3 p-6 rounded-xl bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors sm:hidden">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleInputChange}
                  className="hidden"
                />
                <Camera className="h-8 w-8" />
                <span className="text-lg font-semibold">Направи снимка</span>
              </label>

              {/* Divider on Mobile */}
              <div className="flex items-center gap-3 sm:hidden">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase">или</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-secondary">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Пуснете фактурата тук</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      или кликнете за разглеждане на файлове
                    </p>
                  </div>
                  {/* Camera button visible on desktop */}
                  <label className="cursor-pointer hidden sm:block">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">
                      <Camera className="h-4 w-4" />
                      Направи снимка
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {preview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <Image
                    src={preview}
                    alt="Преглед на фактура"
                    width={600}
                    height={400}
                    className="w-full h-auto max-h-96 object-contain bg-secondary"
                  />
                  <button
                    onClick={clearFile}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={clearFile}
                    className="p-1.5 rounded-full hover:bg-background transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <Button variant="outline" onClick={clearFile} disabled={uploading} className="w-full sm:w-auto">
                  Отказ
                </Button>
                <Button onClick={handleUpload} disabled={uploading} className="w-full sm:flex-1">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Качване...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Качи и извлечи
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {error && !file && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
