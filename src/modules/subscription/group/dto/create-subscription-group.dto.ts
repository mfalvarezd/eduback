import { IsString, IsNotEmpty } from 'class-validator'

export class CreateSubscriptionGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'Subscription ID is required' })
  subscriptionId: string
}
