import * as koffi from 'koffi';
import * as path from 'path';
import { app } from 'electron';

// WinShellPreview.dllの関数を定義
const isDev = !app.isPackaged;

// DLLのパスを取得
const resourcesPath = isDev 
  ? path.join(__dirname, '../../resources')
  : path.join(process.resourcesPath, 'resources');

const dllPath = path.join(resourcesPath, 'WinShellPreview.dll');

// デバッグ用ログ
console.log('=== DLL Path Debug ===');
console.log('isDev:', isDev);
console.log('__dirname:', __dirname);
console.log('resourcesPath:', resourcesPath);
console.log('dllPath:', dllPath);
console.log('DLL exists:', require('fs').existsSync(dllPath));

let lib: any = null;
let getFileThumbnailDLL: any = null;
let getFileIconDLL: any = null;
let saveBitmapToFile: any = null;
let releasePreviewBitmap: any = null;

// DLLを初期化
function initializeDLL() {
  if (lib) return;
  
  try {
    console.log('Loading WinShellPreview.dll from:', dllPath);
    lib = koffi.load(dllPath);
    
    // DLL関数を正しいシグネチャで定義
    try {
      // HRESULT GetFileThumbnail(LPCWSTR filePath, UINT size, HBITMAP* phBitmap)
      getFileThumbnailDLL = lib.func('GetFileThumbnail', 'int32', ['str16', 'uint32', 'void*']);
      console.log('Loaded GetFileThumbnail function');
      
      // HRESULT GetFileIcon(LPCWSTR filePath, UINT size, HBITMAP* phBitmap)
      getFileIconDLL = lib.func('GetFileIcon', 'int32', ['str16', 'uint32', 'void*']);
      console.log('Loaded GetFileIcon function');
      
      // HRESULT SaveBitmapToFile(HBITMAP hBitmap, LPCWSTR outputPath)
      saveBitmapToFile = lib.func('SaveBitmapToFile', 'int32', ['void*', 'str16']);
      console.log('Loaded SaveBitmapToFile function');
      
      // void ReleasePreviewBitmap(HBITMAP hBitmap)
      releasePreviewBitmap = lib.func('ReleasePreviewBitmap', 'void', ['void*']);
      console.log('Loaded ReleasePreviewBitmap function');
      
    } catch (error) {
      console.error('Failed to load DLL functions:', error);
      throw new Error('Could not load required DLL functions');
    }
  } catch (error) {
    console.error('Failed to load WinShellPreview.dll:', error);
    throw error;
  }
}

export async function getFileThumbnail(filePath: string, outputPath: string, size: number = 256): Promise<{
  success: boolean;
  outputPath?: string;
  error?: string;
}> {
  try {
    // DLLを初期化
    initializeDLL();
    
    if (!getFileThumbnailDLL || !getFileIconDLL || !saveBitmapToFile || !releasePreviewBitmap) {
      throw new Error('Required DLL functions not available');
    }
    
    console.log('Calling WinShellPreview.dll with correct signature:', { filePath, outputPath, size });
    
    // HBITMAP用のポインタを作成
    const pBitmap = koffi.alloc('void*', 1);
    
    // まずサムネイル取得を試行（GetFileThumbnail）
    let result: number;
    let hBitmap: any = null;
    let usedFallback = false;
    
    try {
      result = getFileThumbnailDLL(filePath, size, pBitmap);
      console.log('GetFileThumbnail result (HRESULT):', result);
      
      // HRESULT成功チェック（0 = S_OK）
      if (result === 0) {
        hBitmap = koffi.decode(pBitmap, 'void*');
        if (!hBitmap || hBitmap === 0) {
          console.log('GetFileThumbnail returned null bitmap, trying fallback...');
          result = -1; // フォールバックを試行するためにエラー状態にする
        }
      }
    } catch (dllError) {
      console.error('GetFileThumbnail call failed:', dllError);
      result = -1; // フォールバックを試行するためにエラー状態にする
    }
    
    // サムネイル取得に失敗した場合、アイコンをフォールバックとして取得
    if (result !== 0 || !hBitmap || hBitmap === 0) {
      console.log('Thumbnail generation failed, trying icon fallback...');
      usedFallback = true;
      
      // 新しいポインタを作成（前のものがクリアされている可能性があるため）
      const pIconBitmap = koffi.alloc('void*', 1);
      
      try {
        const iconResult = getFileIconDLL(filePath, size, pIconBitmap);
        console.log('GetFileIcon result (HRESULT):', iconResult);
        
        if (iconResult === 0) {
          hBitmap = koffi.decode(pIconBitmap, 'void*');
          if (hBitmap && hBitmap !== 0) {
            result = 0; // 成功状態に設定
          } else {
            return {
              success: false,
              error: 'Failed to generate icon (null HBITMAP)'
            };
          }
        } else {
          return {
            success: false,
            error: `Both thumbnail and icon generation failed. GetFileIcon HRESULT: 0x${iconResult.toString(16)}`
          };
        }
      } catch (iconError) {
        return {
          success: false,
          error: `Both thumbnail and icon generation failed. GetFileIcon error: ${(iconError as Error).message}`
        };
      }
    }
    
    // ビットマップが取得できた場合、ファイルに保存
    if (result === 0 && hBitmap && hBitmap !== 0) {
      try {
        const saveResult = saveBitmapToFile(hBitmap, outputPath);
        console.log('SaveBitmapToFile result:', saveResult);
        
        // ビットマップリソースを解放
        releasePreviewBitmap(hBitmap);
        
        if (saveResult === 0) {
          return {
            success: true,
            outputPath: outputPath
          };
        } else {
          return {
            success: false,
            error: `Failed to save bitmap, HRESULT: 0x${saveResult.toString(16)}`
          };
        }
      } catch (saveError) {
        // エラーが発生してもリソースは解放
        releasePreviewBitmap(hBitmap);
        return {
          success: false,
          error: `SaveBitmapToFile call failed: ${(saveError as Error).message}`
        };
      }
    } else {
      return {
        success: false,
        error: 'Failed to generate both thumbnail and icon'
      };
    }
  } catch (error) {
    console.error('Error in getFilePreview:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// メモリデータから一時ファイルを作成してサムネイルを生成
export async function getFileThumbnailFromMemory(fileData: Uint8Array, fileName: string, size: number = 256): Promise<{
  success: boolean;
  base64?: string;
  error?: string;
  originalPath?: string;
}> {
  let tempInputPath: string | null = null;
  
  try {
    console.log('=== getFileThumbnailFromMemory called ===');
    console.log('Creating temp file for thumbnail generation:', { fileName, dataSize: fileData.length, size });
    console.log('DLL path:', dllPath);
    console.log('Current lib status:', lib ? 'loaded' : 'not loaded');
    
    // 一時ファイルを作成（入力用）
    tempInputPath = path.join(app.getPath('temp'), `temp_input_${Date.now()}_${fileName}`);
    const fs = await import('fs/promises');
    await fs.writeFile(tempInputPath, fileData);
    
    console.log('Temp file created:', tempInputPath);
    
    // 一時ファイルのパスを使ってサムネイル生成
    const thumbnailResult = await getFileThumbnail(tempInputPath, 
      path.join(app.getPath('temp'), `thumbnail_${Date.now()}.png`), size);
    
    if (thumbnailResult.success && thumbnailResult.outputPath) {
      // 生成されたサムネイルファイルをBase64として読み込み
      const imageBuffer = await fs.readFile(thumbnailResult.outputPath);
      const base64 = imageBuffer.toString('base64');
      
      // サムネイルファイルを削除
      try {
        await fs.unlink(thumbnailResult.outputPath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup thumbnail file:', cleanupError);
      }
      
      return {
        success: true,
        base64: `data:image/png;base64,${base64}`,
        originalPath: fileName
      };
    } else {
      return {
        success: false,
        error: thumbnailResult.error
      };
    }
  } catch (error) {
    console.error('Error in getFileThumbnailFromMemory:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  } finally {
    // 入力用一時ファイルを削除
    if (tempInputPath) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(tempInputPath);
        console.log('Temp input file cleaned up:', tempInputPath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp input file:', cleanupError);
      }
    }
  }
}

export async function getFileThumbnailBase64(filePath: string, size: number = 256): Promise<{
  success: boolean;
  base64?: string;
  error?: string;
  originalPath?: string;
}> {
  try {
    // 一時ファイルパスを生成
    const tempOutputPath = path.join(app.getPath('temp'), `thumbnail_${Date.now()}.png`);
    
    // サムネイルを生成
    const thumbnailResult = await getFileThumbnail(filePath, tempOutputPath, size);
    
    if (thumbnailResult.success && thumbnailResult.outputPath) {
      // 生成されたファイルをBase64として読み込み
      const fs = await import('fs/promises');
      const imageBuffer = await fs.readFile(thumbnailResult.outputPath);
      const base64 = imageBuffer.toString('base64');
      
      // 一時ファイルを削除
      try {
        await fs.unlink(thumbnailResult.outputPath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }
      
      return {
        success: true,
        base64: `data:image/png;base64,${base64}`,
        originalPath: filePath
      };
    } else {
      return {
        success: false,
        error: thumbnailResult.error
      };
    }
  } catch (error) {
    console.error('Error in getFileThumbnailBase64:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}
