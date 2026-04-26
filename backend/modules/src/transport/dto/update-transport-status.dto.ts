import { IsIn } from 'class-validator';

export class UpdateTransportStatusDto {
  @IsIn(['planned', 'in_transit', 'delivered'])
  status!: 'planned' | 'in_transit' | 'delivered';
}
