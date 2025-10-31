declare module 'mammoth' {
  export interface ConvertToHtmlOptions {
    buffer?: Buffer;
    path?: string;
  }

  export interface ConvertToMarkdownOptions {
    buffer?: Buffer;
    path?: string;
  }

  export interface ExtractRawTextOptions {
    buffer?: Buffer;
    path?: string;
  }

  export interface Result<T> {
    value: T;
    messages: Message[];
  }

  export interface Message {
    type: string;
    message: string;
  }

  export function convertToHtml(
    options: ConvertToHtmlOptions,
  ): Promise<Result<string>>;
  
  export function convertToMarkdown(
    options: ConvertToMarkdownOptions,
  ): Promise<Result<string>>;
  
  export function extractRawText(
    options: ExtractRawTextOptions,
  ): Promise<Result<string>>;
}