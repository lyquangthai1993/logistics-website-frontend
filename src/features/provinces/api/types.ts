export interface ProvinceReference {
  id: number;
  name: string;
  normalizedName: string;
  region: 'MIỀN BẮC' | 'MIỀN TRUNG' | 'MIỀN NAM';
  aliases: string[];
}
