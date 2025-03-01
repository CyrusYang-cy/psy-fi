const HeaderBox = ({
  type = "title",
  title,
  subtext,
  user,
}: HeaderBoxProps) => {
  return (
    <div className="header-box">
      <h1 className="header-box-title text-white">
        {title}
        {type === "greeting" && (
          <span className="text-blue-400">&nbsp;{user}</span>
        )}
      </h1>
      <p className="header-box-subtext text-gray-300">{subtext}</p>
    </div>
  );
};

export default HeaderBox;
