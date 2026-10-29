import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export const Page404 = () => {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-6xl font-bold text-[#405bb0]">404</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-slate-500">
            Trang không tồn tại. Vui lòng trở lại trang chủ.
          </p>
          <Button onClick={() => navigate('/')}>Trở lại trang chủ</Button>
        </CardContent>
      </Card>
    </main>
  );
};
