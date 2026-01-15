import { Bookmark, Document, Packer, Paragraph, SimpleField, TextRun } from "docx";
import { Injectable, BadRequestException } from '@nestjs/common'

@Injectable()
export class DocumentService{

  async newFile(userEmail: string): Promise<any>;
  async newFile(userEmail: string, data: any): Promise<any>;

  async newFile(userEmail: string, data?: any){
    if(data !== undefined){
      const doc = new Document({
        creator: userEmail,
        lastModifiedBy: userEmail,
        sections: [data],
      });
      return await Packer.toBuffer(doc)
    }else{
      const doc = new Document({
        creator: userEmail,
        lastModifiedBy: userEmail,
        sections: [],
      });
      return await Packer.toBuffer(doc)
    }
  }

}
