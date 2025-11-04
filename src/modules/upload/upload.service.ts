import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  UPLOAD_MESSAGES,
  RANDOM_ID_MAX,
} from '@common/constants/upload.constants';
import { LangChainService } from '@/modules/langchain/langchain.service';

export interface ParsedFromFileDataPayload {
  fileName: string;
  fileType: string;
  extractedText: string;
}

export interface CachedParsedFromFileData extends ParsedFromFileDataPayload {
  id: string;
  receivedAt: Date;
  analysis?: MedicalDataCheck;
}
export interface MedicalDataCheck {
  isMedical?: boolean;
  hasBloodMarkers?: boolean;
}

export interface CacheOperationResult {
  message: string;
  saved: boolean;
  id: string;
  analysis?: MedicalDataCheck;
}

export interface ClearCachedDataResult {
  message: string;
}

@Injectable()
export class UploadService {
  public memoryStore: CachedParsedFromFileData[] = [];

  constructor(private readonly langChainService: LangChainService) {}

  async cacheParsedFromFileData(
    payload: ParsedFromFileDataPayload,
  ): Promise<CacheOperationResult> {
    try {
      if (!payload.extractedText || payload.extractedText.trim().length === 0) {
        throw new InternalServerErrorException(UPLOAD_MESSAGES.FAILED);
      }

      if (payload.extractedText.length > 50000) {
        throw new InternalServerErrorException(UPLOAD_MESSAGES.FAILED);
      }

      this.clearCachedFileData();

      const analysis = await this.langChainService.checkBloodMarkers(
        payload.extractedText,
      );

      const newRecord: CachedParsedFromFileData = {
        id: `${Date.now()}-${Math.floor(Math.random() * RANDOM_ID_MAX)}`,
        receivedAt: new Date(),
        ...payload,
        analysis,
      };

      this.memoryStore.push(newRecord);

      return {
        message: UPLOAD_MESSAGES.SUCCESS,
        saved: true,
        id: newRecord.id,
        analysis: analysis,
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException(UPLOAD_MESSAGES.FAILED, error);
    }
  }

  getAllCachedFileData(): CachedParsedFromFileData[] {
    return this.memoryStore;
  }

  clearCachedFileData(): ClearCachedDataResult {
    this.memoryStore = [];
    return { message: UPLOAD_MESSAGES.CLEARED };
  }

  async queryCachedData(id: string, query: string): Promise<string> {
    try {
      const record = this.memoryStore.find((item) => item.id === id);
      if (!record) {
        throw new Error(UPLOAD_MESSAGES.NOT_FOUND);
      }
      return await this.langChainService.customQuery(
        record.extractedText,
        query,
      );
    } catch (error) {
      throw new InternalServerErrorException(UPLOAD_MESSAGES.FAILED, error);
    }
  }
}
