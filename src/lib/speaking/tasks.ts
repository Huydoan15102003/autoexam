export type Level = 'A2' | 'B1' | 'B2' | 'C1'
export type ReadPassage = { id: string; title: string; level: Level; text: string }
export type Topic = { id: string; title: string; level: Level; question: string; hints?: string[] }

export const READ_PASSAGES: ReadPassage[] = [
  {
    id: 'morning-routine',
    title: 'My morning routine',
    level: 'A2',
    text: 'I usually wake up at six o’clock. First, I drink a glass of water and open the window. Then I have breakfast with my family, usually bread and eggs. After that, I ride my bike to school. It takes about fifteen minutes, and I enjoy the fresh air on the way.',
  },
  {
    id: 'learning-online',
    title: 'Learning online',
    level: 'B1',
    text: 'Online learning has become very popular in recent years. Students can watch lessons at home and study at their own speed. However, it is not always easy to stay focused without a teacher in the room. Many learners say that a clear plan and short breaks help them concentrate and remember more.',
  },
  {
    id: 'plastic-waste',
    title: 'Plastic waste',
    level: 'B1',
    text: 'Every year, millions of tons of plastic end up in the ocean. This waste harms fish, birds and other sea animals. Small changes can make a big difference. For example, we can carry a reusable bottle, say no to plastic bags and sort our rubbish at home so that more of it can be recycled.',
  },
  {
    id: 'smartphones',
    title: 'Smartphones and teenagers',
    level: 'B2',
    text: 'Smartphones give teenagers instant access to information and a way to stay in touch with friends. On the other hand, spending too much time on social media can affect sleep and concentration. Rather than banning phones completely, many parents and schools now encourage young people to set limits and use technology in a more mindful way.',
  },
  {
    id: 'city-life',
    title: 'Living in a big city',
    level: 'B2',
    text: 'Living in a big city offers exciting opportunities, from better jobs to a wide range of entertainment. Nevertheless, city life also comes with challenges such as heavy traffic, air pollution and high living costs. As urban populations continue to grow, governments must invest in public transport and green spaces to keep cities pleasant places to live.',
  },
  {
    id: 'artificial-intelligence',
    title: 'Artificial intelligence in education',
    level: 'C1',
    text: 'Artificial intelligence is gradually reshaping the way we teach and learn. Adaptive platforms can identify a student’s weaknesses and tailor exercises accordingly, while automated feedback allows learners to practise far more often than a single teacher could support. Critics, however, warn that over-reliance on these tools may discourage independent thinking, so educators must strike a careful balance between efficiency and genuine understanding.',
  },
]

export const TOPICS: Topic[] = [
  {
    id: 'hometown',
    title: 'Your hometown',
    level: 'A2',
    question: 'Where is your hometown? What do you like most about it?',
    hints: ['Where it is', 'What it is famous for', 'What you like or dislike'],
  },
  {
    id: 'free-time',
    title: 'Free time',
    level: 'A2',
    question: 'What do you usually do in your free time? Why do you enjoy it?',
    hints: ['Activities', 'Who you do them with', 'Why you enjoy them'],
  },
  {
    id: 'teacher',
    title: 'A teacher who influenced you',
    level: 'B1',
    question: 'Describe a teacher who influenced you.',
    hints: ['Who this teacher was', 'What subject he or she taught', 'What he or she was like', 'And explain how this teacher influenced you'],
  },
  {
    id: 'trip',
    title: 'A memorable trip',
    level: 'B1',
    question: 'Describe a memorable trip you have taken.',
    hints: ['Where you went', 'Who you went with', 'What you did there', 'And explain why it was memorable'],
  },
  {
    id: 'technology',
    title: 'A useful piece of technology',
    level: 'B2',
    question: 'Describe a piece of technology that you find very useful.',
    hints: ['What it is', 'How often you use it', 'What you use it for', 'And explain why it is so useful to you'],
  },
  {
    id: 'environment',
    title: 'Protecting the environment',
    level: 'B2',
    question: 'What can individuals do to protect the environment? Is it the responsibility of individuals or governments?',
    hints: ['Everyday actions', 'Role of governments and companies', 'Your own opinion with examples'],
  },
  {
    id: 'online-education',
    title: 'The future of education',
    level: 'C1',
    question: 'Do you think online learning will ever replace traditional classrooms? Why or why not?',
    hints: ['Advantages of online learning', 'What classrooms offer that screens cannot', 'Your prediction for the future'],
  },
]
