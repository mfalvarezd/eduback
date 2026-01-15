import { BadRequestException, } from '@nestjs/common'

const windowsReservedNames = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "COM¹", "COM²", "COM³",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
  "LPT¹", "LPT²", "LPT³"
])

const forbiddenCharacters = /[\\/:*?"<>|]/

export class projectService {
  constructor(
    readonly format = {
      Etiqueta: '.docx',
      Documenta: '.docx',
      Formula: '.docx',
      Cocina: '.docx',
      HACCP: '.docx',
      Evalua: '.docx',
      Piensa: '.docx',
      Audita: '.docx',
      Gestiona: '.docx',
      Controla: '.docx',
      Educa: '.docx',
    },
  
    readonly userInfo = {
      select: {
        email: true,
        firstName: true,
        lastName: true,
        urlPhoto: true,
      },
    }
  ) {}

  readonly maxCharacters = 210
  
  changeName(name: string, existingElement: any, existingElementsCopy: any) {
    if (existingElementsCopy.length > 0) {
      var max = 1
      existingElementsCopy.map((Element: any) => {
        const match = Element.name.match(/\((\d+)\)$/) // Expresión regular para capturar números entre paréntesis
        if (match) {
          const numero = parseInt(match[1], 10)
          if (numero > max) {
            max = numero
          }
        }
      })
      return `${name} (${max + 1})`
    } else if (existingElement) {
      return `${name} (1)`
    }
    return name
  }

  validateFileName(name: string) {
    this.validation(name, false)
  }

  validateName(name: string) {
    this.validation(name, true)
  }
  
  private validation(name: string, isFolder: boolean) {
    if (forbiddenCharacters.test(name)) {
      throw new BadRequestException(`Name can't contain any of this character: \\/:*?"<>|`)
    }
  
    if (isFolder) {
      if (/^[.]+$|^[ ]+$/.test(name)) {
        throw new BadRequestException(`Name can't contain only periods nor only spaces`)
      }
    } else {
      if (/^[ ]+$/.test(name)) {
        throw new BadRequestException(`Name can't contain only spaces`)
      }
    }
  
    const baseName = name.toUpperCase();
    if (windowsReservedNames.has(baseName)){
      throw new BadRequestException(`Name can't be a reserved word of windows`)
    }
  }  
}
