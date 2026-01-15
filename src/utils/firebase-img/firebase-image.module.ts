import { Module } from '@nestjs/common'
import { FirebaseImagesService } from './firebase-image.service'

@Module({
  providers: [FirebaseImagesService],
  exports: [FirebaseImagesService],
})
export class FirebaseModule {}
