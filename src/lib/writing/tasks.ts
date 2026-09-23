export type WritingPrompt = { id: string; title: string; prompt: string }

// VSTEP Writing Task 1: letter/email, 120–150 words, ~20 minutes
export const TASK1_PROMPTS: WritingPrompt[] = [
  {
    id: 'friend-visit',
    title: 'Trả lời email của bạn sắp đến thăm',
    prompt: `You received an email from your English friend, Jenny:

"Hi there,
I'm going to visit your city for three days next month. What will the weather be like then? Which places do you think I should visit? And is there any local food I really must try? Can't wait to see you!
Jenny"

Write an email to reply to Jenny. In your email, you should:
- tell her about the weather at that time of year
- suggest some places she should visit
- recommend some local food she should try

You should write at least 120 words.`,
  },
  {
    id: 'hotel-complaint',
    title: 'Thư phàn nàn gửi khách sạn',
    prompt: `You recently stayed at the Sunrise Hotel for a weekend, but you were not satisfied with your stay.

Write a letter to the hotel manager. In your letter, you should:
- give details of your stay (dates, type of room)
- explain what problems you had
- say what you would like the manager to do

You should write at least 120 words.`,
  },
  {
    id: 'part-time-job',
    title: 'Email xin việc làm thêm',
    prompt: `You saw this advertisement on a notice board:

"PART-TIME SALES ASSISTANT WANTED – City Bookstore. Evenings and weekends. Good English and friendly personality required."

Write an email to the manager to apply for the job. In your email, you should:
- introduce yourself
- explain why you are suitable for the job
- say when you are available and ask about the pay

You should write at least 120 words.`,
  },
  {
    id: 'invite-teacher',
    title: 'Mời thầy giáo dự sự kiện của trường',
    prompt: `Your class is organising an English Day at your school next month. You want to invite your former English teacher, Mr Brown.

Write an email to Mr Brown. In your email, you should:
- give details of the event (date, time, place and activities)
- explain why you would like him to come
- ask him to give a short talk and suggest a topic

You should write at least 120 words.`,
  },
]

// VSTEP Writing Task 2: essay, 250–300 words, ~40 minutes
export const TASK2_PROMPTS: WritingPrompt[] = [
  {
    id: 'social-media-harm',
    title: 'Mạng xã hội hại nhiều hơn lợi? (Đồng ý/Phản đối)',
    prompt: `Write an essay to an educated reader on the following topic:

Some people say that social media does more harm than good to young people. To what extent do you agree or disagree?

Include reasons and any relevant examples to support your answer.

You should write at least 250 words.`,
  },
  {
    id: 'early-foreign-language',
    title: 'Học ngoại ngữ từ tiểu học (Thảo luận hai quan điểm)',
    prompt: `Write an essay to an educated reader on the following topic:

Some people think children should start learning a foreign language at primary school, while others believe they should wait until secondary school. Discuss both views and give your own opinion.

Include reasons and any relevant examples to support your answer.

You should write at least 250 words.`,
  },
  {
    id: 'working-from-home',
    title: 'Làm việc tại nhà (Ưu điểm/Nhược điểm)',
    prompt: `Write an essay to an educated reader on the following topic:

More and more people are choosing to work from home instead of going to an office. What are the advantages and disadvantages of this trend?

Include reasons and any relevant examples to support your answer.

You should write at least 250 words.`,
  },
  {
    id: 'air-pollution',
    title: 'Ô nhiễm không khí ở thành phố (Vấn đề/Giải pháp)',
    prompt: `Write an essay to an educated reader on the following topic:

Air pollution is becoming a serious problem in many big cities. What are the main causes of this problem, and what measures can be taken to solve it?

Include reasons and any relevant examples to support your answer.

You should write at least 250 words.`,
  },
]
