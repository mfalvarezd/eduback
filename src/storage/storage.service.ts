import { createClient } from '@supabase/supabase-js';
import { Injectable } from '@nestjs/common'
/*const brotli = require('brotli-wasm');
const fs = require('fs');*/

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

@Injectable()
export class StorageService{

  async postBucket(bucket: string) {
    const { data, error } = await supabase
    .storage
    .createBucket(bucket, {
      public: true,
      fileSizeLimit: '1MB'
    })

    if (error) {
      throw error
    }
    return data
  }

  async deleteBucket(bucket: string) {
    const { data, error } = await supabase
    .storage
    .deleteBucket(bucket)

    if (error) {
      throw error
    }
    return data
  }

  async getFileSize(bucket: string, docName: string) {
    const { data, error } = await supabase
    .storage
    .from(bucket)
    .info(docName)

    if (error) {
      throw error
    }

    return data.size;
  }

  async postFile(bucket: string, docName: string, buffer:any) {
    const { data, error } = await supabase
    .storage
    .from(bucket)
    .upload(docName, buffer)

    if (error) {
      throw error
    }
    return data
  }

  async download(bucket: string, docName: string){
    const { data, error } = await supabase
    .storage
    .from(bucket)
    .download(docName);

    if (error) {
      throw error
    }

    return data
      /*const buffer = Buffer.from(await data.arrayBuffer());
      const decompressedData = await brotli.decompress(buffer);

      fs.writeFileSync('./tempfile.docx', decompressedData);*/
  }

  async removeFile(bucket: string, docName: string[]) {
    const { data, error } = await supabase
    .storage
    .from(bucket)
    .remove(docName)

    if (error) {
      throw error
    }
    return data
  }

  async updateFile(bucket: string, docName: string, buffer:any) {
    const { data, error } = await supabase
    .storage
    .from(bucket)
    .update(docName, buffer);

    if (error) {
      throw error
    }
    return data
  }

  async moveFile(bucket: string, docName: string, newPath: string) {
    const { data, error } = await supabase
    .storage
    .from(bucket)
    .move(docName, newPath);

    if (error) {
      throw error
    }
    return data
  }

  async copyFile(bucket: string, docName: string, newPath: string) {
    const { data, error } = await supabase
    .storage
    .from(bucket)
    .copy(docName, newPath);

    if (error) {
      throw error
    }
    return data
  }

  async listFiles(bucket: string, folderPath: string) {
    const { data, error } = await supabase
    .storage
    .from(bucket)
    .list(folderPath)
    
    if (error) {
      throw error
    }
    return data
  }

  async iterativeGetAllSize(bucket: string){
    var sizes = {}
    sizes[''] = 0

    var filesPath = {}
    var folderPath = {}

    const pathStack: any[] = []

    const folders = {};
    const folderStack: any[] = []
    
    let subFolderStack: any[] = [] //Saves all the folders of the current path.
    let files = await this.listFiles(bucket, ''); //Get all the filesss and folders of the curent path.
  
    for (const file of files) {
      if(file.metadata){ //If it has metadata is a file.
        filesPath[file.name] = file.name
        sizes[file.name] = file.metadata.size
        sizes[''] = sizes['']+file.metadata.size
      }else{ //If it doesn't have a metadata is a folder.
        folderPath[file.name] = file.name
        pathStack.push(file.name)
        subFolderStack.push(file.name)
      }
    }

    //If the current path has folders it saves the array of folders with the key as the current path.
    if(subFolderStack.length > 0){
      folders[''] = subFolderStack
      folderStack.push('')
    }
  
    while (pathStack.length > 0) {
      const currentPath = pathStack.pop();
      subFolderStack = [] //Clean the subFolderStack.
      sizes[currentPath] = 0

      files = await this.listFiles(bucket, currentPath); //Get all the filesss and folders of the curent path.
  
      for (const file of files) {
        if(file.metadata){ //If it has metadata is a file.
          filesPath[file.name] = currentPath+"/"+file.name
          sizes[currentPath+"/"+file.name] = file.metadata.size
          sizes[currentPath] = sizes[currentPath]+file.metadata.size
        }else{ //If it doesn't have a metadata is a folder.
          folderPath[file.name] = currentPath+"/"+file.name
          pathStack.push(currentPath+"/"+file.name)
          subFolderStack.push(currentPath+"/"+file.name)
        }
      }

      //If the current path has folders it saves the array of folders with the key as the current path.
      if(subFolderStack.length > 0){
        folders[currentPath] = subFolderStack
        folderStack.push(currentPath)
      }
    }
  
    //Add the size value of the folders in a folder.
    while (folderStack.length > 0) {
      const currentPath = folderStack.pop();
      const subFolders = folders[currentPath] //Get the folders of a folder.
      for (const folder of subFolders) {
        sizes[currentPath] = sizes[currentPath]+sizes[folder]
      }
    }
  
    return {sizes, filesPath, folderPath};
  }
  
  async iterativeGetFolderSize(bucket: string, folderPath: string) {
    var sizes = {};

    const pathStack: any[] = []
    pathStack.push(folderPath)

    const folders = {};
    const folderStack: any[] = []
  
    while (pathStack.length > 0) {
      const currentPath = pathStack.pop();
      sizes[currentPath] = 0 //Initialize the size of the current path

      const subFolderStack: any[] = [] //Saves all the folders of the current path.
      const files = await this.listFiles(bucket, currentPath); //Get all the filesss and folders of the curent path.
  
      for (const file of files) {
        if(file.metadata){ //If it has metadata is a file.
          sizes[currentPath+"/"+file.name] = file.metadata.size
          sizes[currentPath] = sizes[currentPath]+file.metadata.size
        }else{ //If it doesn't have a metadata is a folder.
          pathStack.push(currentPath+"/"+file.name)
          subFolderStack.push(currentPath+"/"+file.name)
        }
      }

      //If the current path has folders it saves the array of folders with the key as the current path.
      if(subFolderStack.length > 0){
        folders[currentPath] = subFolderStack
        folderStack.push(currentPath)
      }
    }
  
    //Add the size value of the folders in a folder.
    while (folderStack.length > 0) {
      const currentPath = folderStack.pop();
      const subFolders = folders[currentPath] //Get the folders of a folder.
      for (const folder of subFolders) {
        sizes[currentPath] = sizes[currentPath]+sizes[folder]
      }
    }
  
    return sizes;
  }
}
