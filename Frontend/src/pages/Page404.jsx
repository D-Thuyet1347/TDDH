import { Button, Result } from 'antd'
import React from 'react'
import { useNavigate } from 'react-router-dom';

export const Page404 = () => {
    const navigate = useNavigate();
    const backHome = () => {
        navigate("/");
    }
  return (
    <>
        <Result
    status="500"
    title="404"
    style={{width: 278, margin: "auto"}}
    subTitle="Page không tồn tại vui lòng trở lại trang chủ."
    extra={<Button onClick={backHome} className='bg-blue-300'>Trở lại trang chủ</Button>}
  />
    </>
  )
}
