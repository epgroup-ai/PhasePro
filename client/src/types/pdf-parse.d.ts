declare module 'pdf-parse' {
  interface PDFParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
  }

  export default function (
    dataBuffer: Buffer, 
    options?: {
      pagerender?: (pageData: {
        getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
      }) => Promise<string>;
      max?: number;
    }
  ): Promise<PDFParseResult>;
}