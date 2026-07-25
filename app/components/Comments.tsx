"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChatCircle, PaperPlane } from "@phosphor-icons/react";

type Comment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
};

export function Comments({ slug }: { slug: string }) {
  const storageKey = `hedon-comments:${slug}`;
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setComments(JSON.parse(saved) as Comment[]);
  }, [storageKey]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !body.trim()) return;
    const next = [
      ...comments,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        body: body.trim(),
        createdAt: new Date().toISOString(),
      },
    ];
    setComments(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setBody("");
  };

  return (
    <section className="comments" aria-labelledby="comments-heading">
      <div className="comments-heading">
        <ChatCircle size={23} />
        <div>
          <h2 id="comments-heading">评论</h2>
          <p>当前预览的留言保存在本机；接入 Giscus 后可同步到 GitHub Discussions。</p>
        </div>
      </div>
      {comments.length > 0 && (
        <div className="comment-list">
          {comments.map((comment) => (
            <article key={comment.id}>
              <div>
                <strong>{comment.name}</strong>
                <time>{new Date(comment.createdAt).toLocaleDateString("zh-CN")}</time>
              </div>
              <p>{comment.body}</p>
            </article>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="comment-form">
        <label>
          称呼
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="怎么称呼你"
            maxLength={40}
          />
        </label>
        <label>
          留言
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="写下你的想法…"
            rows={4}
            maxLength={800}
          />
        </label>
        <button type="submit" disabled={!name.trim() || !body.trim()}>
          <PaperPlane size={17} />
          发布评论
        </button>
      </form>
    </section>
  );
}
