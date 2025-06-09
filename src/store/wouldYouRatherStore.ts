import { create } from 'zustand'

export interface WouldYouRatherQuestion {
  id: number
  option1: {
    text: string
    image: string
  }
  option2: {
    text: string
    image: string
  }
}

interface WouldYouRatherState {
  currentQuestionIndex: number
  answers: Record<number, number> // Maps question ID to selected option (1 or 2)
  setAnswer: (questionId: number, option: number) => void
  nextQuestion: () => void
  resetGame: () => void
}

const questions: WouldYouRatherQuestion[] = [
  {
    id: 1,
    option1: {
      text: "Work from home",
      image: "/images/wfh.jpg"
    },
    option2: {
      text: "Work in an office",
      image: "/images/office.jpg"
    }
  },
  {
    id: 2,
    option1: {
      text: "Lead a team",
      image: "/images/leadership.jpg"
    },
    option2: {
      text: "Work independently",
      image: "/images/independent.jpg"
    }
  },
  {
    id: 3,
    option1: {
      text: "Create new products",
      image: "/images/create.jpg"
    },
    option2: {
      text: "Improve existing products",
      image: "/images/improve.jpg"
    }
  },
  {
    id: 4,
    option1: {
      text: "Work with data",
      image: "/images/data.jpg"
    },
    option2: {
      text: "Work with people",
      image: "/images/people.jpg"
    }
  },
  {
    id: 5,
    option1: {
      text: "Work on short-term projects",
      image: "/images/short-term.jpg"
    },
    option2: {
      text: "Work on long-term projects",
      image: "/images/long-term.jpg"
    }
  }
]

export const useWouldYouRatherStore = create<WouldYouRatherState>((set) => ({
  currentQuestionIndex: 0,
  answers: {},
  setAnswer: (questionId, option) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: option },
    })),
  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
    })),
  resetGame: () =>
    set({
      currentQuestionIndex: 0,
      answers: {},
    }),
}))

export { questions } 