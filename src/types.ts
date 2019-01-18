export interface Object {
  discriminator: EntityType
  name: string
  properties: Property[]
  includes: string[]
}

export interface Property {
  name: string
  type: string
  nullable: boolean
}

export interface Enum {
  discriminator: EntityType
  name: string
  values: string[]
}

export interface UnionType {
  discriminator: EntityType
  name: string
  types: string[]
}

export type Entity = Object | Enum | UnionType

export enum EntityType {
  Object,
  Enum,
  UnionType
}
