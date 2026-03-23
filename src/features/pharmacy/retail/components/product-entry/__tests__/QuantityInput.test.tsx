import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QuantityInput } from "../QuantityInput";

function Harness(props: { min?: number; max?: number; onLimitHit?: () => void }) {
  const [value, setValue] = React.useState(0);

  return (
    <QuantityInput
      value={value}
      onChange={setValue}
      min={props.min ?? 0}
      max={props.max ?? 5}
      onLimitHit={props.onLimitHit}
      testId="qty"
    />
  );
}

describe("QuantityInput", () => {
  it("clamps typed values to max and triggers onLimitHit", () => {
    const onLimitHit = vi.fn();
    render(<Harness max={5} onLimitHit={onLimitHit} />);

    fireEvent.change(screen.getByTestId("qty-input"), { target: { value: "9" } });

    expect((screen.getByTestId("qty-input") as HTMLInputElement).value).toBe("5");
    expect(onLimitHit).toHaveBeenCalledTimes(1);
  });

  it("calls onLimitHit when incrementing at max", () => {
    const onLimitHit = vi.fn();
    render(<Harness max={1} onLimitHit={onLimitHit} />);

    fireEvent.change(screen.getByTestId("qty-input"), { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("qty-inc"));

    expect((screen.getByTestId("qty-input") as HTMLInputElement).value).toBe("1");
    expect(onLimitHit).toHaveBeenCalled();
  });
});
