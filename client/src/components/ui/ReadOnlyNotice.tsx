import { FC } from 'react';
import { MdLockOutline } from 'react-icons/md';

const ReadOnlyNotice: FC<{ message?: string }> = ({
  message = 'You have read-only access here. Ask an administrator if you need to make changes.',
}) => (
  <div className="flex items-center gap-3 bg-info-50 border border-info-200 text-info-800 rounded-lg px-4 py-3 text-sm">
    <MdLockOutline className="w-5 h-5 flex-shrink-0" />
    <p>{message}</p>
  </div>
);

export default ReadOnlyNotice;
