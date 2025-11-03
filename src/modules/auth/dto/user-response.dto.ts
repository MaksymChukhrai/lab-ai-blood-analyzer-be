import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  public id: string;

  @ApiProperty({ example: 'user@example.com' })
  public email: string;

  @ApiProperty({
    example: 'google',
    enum: ['google', 'linkedin', 'magic_link'],
    required: false,
  })
  public provider?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  public createdAt: Date;

  constructor(user: UserEntity) {
    this.id = user.id;
    this.email = user.email;
    this.provider = user.provider;
    this.createdAt = user.createdAt;
  }
}
