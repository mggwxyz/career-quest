export type CareerScene = {
  onetId: string
  careerTitle: string
  sceneDescription: string
  imagePrompt: string
  imagePath: string
  generatedAt: string
  textModel: string
  imageModel: string
}

export type SceneManifest = Record<string, CareerScene>
