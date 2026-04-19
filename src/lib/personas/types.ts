export type Gender = 'female' | 'male' | 'nonbinary'

export type EthnicityCue =
  | 'white'
  | 'black'
  | 'hispanic'
  | 'asian'
  | 'middle_eastern'
  | 'pacific_islander'
  | 'indigenous'
  | 'multiracial'

export type AgeBand = '20s' | '30s' | '40s' | '50s_plus'

export type Persona = {
  onetId: string
  name: string
  age: number
  gender: Gender
  pronouns: string
  ethnicityCue: EthnicityCue
  ageBand: AgeBand
  yearsInField: number
  location: string
  educationPath: string
  pathToCurrentPosition: string
  dayInTheLife: string
  hobby: string
  imagePrompt: string
  generatedAt: string
  textModel: string
  imageModel: string
}

export type PersonaManifest = Record<string, Persona>
