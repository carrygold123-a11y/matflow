import { IsIn } from 'class-validator';

export class UpdateMaterialStatusDto {
  @IsIn(['available', 'reserved', 'picked_up'])
  status!: 'available' | 'reserved' | 'picked_up';
}
