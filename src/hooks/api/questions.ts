import api from '@/lib/api';
import { TApiPromise, TMutationOpts, TQueryOpts } from '@/types/api';
import { TCreateQuestionInput, TQuestion, TUpdateQuestionInput } from '@/types/Question';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type TGetQuestionsParams = {
  chapterId?: string;
  subjectId?: string;
  classId?: string;
  featureType?: string;
};

const getQuestions = (params: TGetQuestionsParams): TApiPromise<TQuestion[]> =>
  api.get('/api/v1/questions', { params });

const createQuestion = (data: TCreateQuestionInput): TApiPromise<TQuestion> =>
  api.post('/api/v1/questions', data);

const updateQuestion = ({ id, ...data }: TUpdateQuestionInput & { id: string }): TApiPromise<TQuestion> =>
  api.put(`/api/v1/questions/${id}`, data);

const deleteQuestion = (id: string): TApiPromise<null> =>
  api.delete(`/api/v1/questions/${id}`);

export const useGetQuestions = (
  params: TGetQuestionsParams,
  options?: TQueryOpts<TQuestion[]>
) =>
  useQuery({
    queryKey: ['questions', params.chapterId, params.subjectId, params.classId, params.featureType],
    queryFn: () => getQuestions(params),
    ...options,
  });

export const useCreateQuestion = (options?: TMutationOpts<TCreateQuestionInput, TQuestion>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TCreateQuestionInput) => createQuestion(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
    ...options,
  });
};

export const useUpdateQuestion = (
  options?: TMutationOpts<TUpdateQuestionInput & { id: string }, TQuestion>
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TUpdateQuestionInput & { id: string }) => updateQuestion(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
    ...options,
  });
};

export const useDeleteQuestion = (options?: TMutationOpts<string, null>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
    ...options,
  });
};
