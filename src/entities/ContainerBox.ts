import type { Database } from '../types/database.types';

export type ContainerBox = Database['public']['Tables']['container_box']['Row'] & {
  description: string | null;
};
export type NewContainerBox = Database['public']['Tables']['container_box']['Insert'];
export type ContainerBoxUpdate = Database['public']['Tables']['container_box']['Update'];
